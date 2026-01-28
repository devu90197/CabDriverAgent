import os
import uuid
from typing import Dict, List, Optional, Any
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
import httpx
import json
import traceback
import uuid
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)

# Import our algorithms
from routes.algorithms import (
    dijkstra, 
    astar, 
    nn_plus_2opt, 
    create_graph_from_edges,
    haversine_distance
)

# Import enhanced algorithms with step-by-step execution
from routes.enhanced_algorithms import (
    solve_route_with_multiple_stops,
    haversine_distance as enhanced_haversine_distance
)

app = FastAPI(
    title="Cab/Delivery Route Estimator API",
    description="API for estimating optimal routes for cab/delivery services",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class Location(BaseModel):
    lat: float
    lng: float

class RouteEstimateRequest(BaseModel):
    user_id: str
    pickup: Location
    dropoff: Location
    stops: List[Location] = []
    optimize_for: str = "time"  # time|distance|fare
    algorithm: str = "auto"  # auto|dijkstra|astar
    async_mode: bool = False  # Changed from 'async' to 'async_mode' to avoid keyword conflict
    detailed_steps: bool = False  # New field for step-by-step execution
    show_algorithm_comparison: bool = False  # New field for algorithm comparison

class JobStatusResponse(BaseModel):
    job_id: str
    status: str  # queued|running|completed|failed
    progress: int = 0

class JobResultResponse(BaseModel):
    job_id: str
    result: Optional[Dict[str, Any]] = None

class WebhookAckRequest(BaseModel):
    job_id: str
    status: str
    message: Optional[str] = None

async def find_nearest_node(lat: float, lng: float) -> Dict[str, Any]:
    """Find nearest node to given coordinates"""
    try:
        # Find nearest node using Euclidean distance approximation
        response = supabase.rpc("find_nearest_node", {"lat": lat, "lng": lng}).execute()
        if response.data:
            return response.data[0]
        
        # Fallback to simple query if RPC doesn't exist
        response = supabase.table("nodes").select("*").order("id").limit(1).execute()
        if response.data:
            return response.data[0]
        
        # Return default node if nothing found
        return {
            "id": 1,
            "lat": lat,
            "lng": lng
        }
    except Exception as e:
        print(f"Error finding nearest node: {e}")
        # Return default node on error
        return {
            "id": 1,
            "lat": lat,
            "lng": lng
        }

async def get_subgraph_edges(node_ids: List[int]) -> List[Dict[str, Any]]:
    """Get edges for subgraph containing specified nodes"""
    try:
        # Convert node_ids to a format suitable for SQL IN clause
        node_ids_str = ','.join(map(str, node_ids))
        
        # Query edges where both from_node and to_node are in our node list
        response = supabase.table("edges").select("*").execute()
        
        # Filter edges to only include those connecting our nodes
        edges = []
        if response.data:
            for edge in response.data:
                if edge["from_node"] in node_ids and edge["to_node"] in node_ids:
                    edges.append(edge)
        
        return edges
    except Exception as e:
        print(f"Error fetching subgraph edges: {e}")
        # Return mock edges on error
        edges = []
        for i in range(len(node_ids) - 1):
            edges.append({
                "id": i,
                "from_node": node_ids[i],
                "to_node": node_ids[i+1],
                "distance_km": haversine_distance(
                    12.9716 + i*0.01, 
                    77.5946 + i*0.01,
                    12.9716 + (i+1)*0.01,
                    77.5946 + (i+1)*0.01
                ),
                "travel_time_min": 5
            })
        return edges

async def insert_job(job_id: str, user_id: str, params: Dict[str, Any]) -> None:
    """Insert job record into database"""
    try:
        job_data = {
            "job_id": job_id,
            "user_id": user_id,
            "status": "queued",
            "params": params,
            "progress": 0
        }
        response = supabase.table("jobs").insert(job_data).execute()
        print(f"Inserted job {job_id} for user {user_id}")
    except Exception as e:
        print(f"Error inserting job {job_id}: {e}")

async def update_job_status(job_id: str, status: str, progress: int = 0) -> None:
    """Update job status in database"""
    try:
        update_data = {
            "status": status,
            "progress": progress,
            "updated_at": "now()"
        }
        response = supabase.table("jobs").update(update_data).eq("job_id", job_id).execute()
        print(f"Updated job {job_id} status to {status} with progress {progress}%")
    except Exception as e:
        print(f"Error updating job {job_id} status: {e}")

async def update_job_result(job_id: str, result: Dict[str, Any]) -> None:
    """Update job result in database"""
    try:
        update_data = {
            "result": result,
            "status": "completed",
            "progress": 100,
            "updated_at": "now()"
        }
        response = supabase.table("jobs").update(update_data).eq("job_id", job_id).execute()
        print(f"Updated job {job_id} result: {result}")
    except Exception as e:
        print(f"Error updating job {job_id} result: {e}")

async def get_job(job_id: str) -> Dict[str, Any]:
    """Get job details from database"""
    try:
        response = supabase.table("jobs").select("*").eq("job_id", job_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        else:
            # Return default job if not found
            return {
                "job_id": job_id,
                "user_id": "u_123",
                "status": "completed",
                "params": {},
                "progress": 100,
                "result": {
                    "route_geojson": {
                        "type": "LineString",
                        "coordinates": [[77.59, 12.97], [77.62, 12.95]]
                    },
                    "distance_km": 12.4,
                    "eta_min": 28,
                    "algorithm": "astar"
                },
                "created_at": "2023-01-01T00:00:00Z",
                "updated_at": "2023-01-01T00:00:00Z"
            }
    except Exception as e:
        print(f"Error fetching job {job_id}: {e}")
        # Return default job on error
        return {
            "job_id": job_id,
            "user_id": "u_123",
            "status": "completed",
            "params": {},
            "progress": 100,
            "result": {
                "route_geojson": {
                    "type": "LineString",
                    "coordinates": [[77.59, 12.97], [77.62, 12.95]]
                },
                "distance_km": 12.4,
                "eta_min": 28,
                "algorithm": "astar"
            },
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }

# Helper functions
async def map_match_coordinates(coords: List[Location]) -> List[Dict[str, Any]]:
    """Map-match coordinates to nearest nodes"""
    nodes = []
    for coord in coords:
        node = await find_nearest_node(coord.lat, coord.lng)
        nodes.append(node)
    return nodes

async def get_osrm_route(start_coords, end_coords):
    """Get route from OSRM routing service"""
    try:
        # OSRM route service URL
        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{start_coords[1]},{start_coords[0]};{end_coords[1]},{end_coords[0]}?overview=full&geometries=geojson"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(osrm_url, timeout=30.0)
            if response.status_code == 200:
                data = response.json()
                if data.get("routes") and len(data["routes"]) > 0:
                    route = data["routes"][0]
                    # Convert OSRM GeoJSON format to our format
                    coordinates = []
                    for coord in route["geometry"]["coordinates"]:
                        # OSRM returns [lng, lat], we need [lng, lat] for our GeoJSON
                        coordinates.append([coord[0], coord[1]])
                    
                    return {
                        "coordinates": coordinates,
                        "distance_km": route["distance"] / 1000,  # Convert meters to km
                        "duration_min": route["duration"] / 60  # Convert seconds to minutes
                    }
    except Exception as e:
        print(f"OSRM routing error: {e}")
        return None

async def compute_sync_route(request: RouteEstimateRequest) -> Dict[str, Any]:
    """Compute route synchronously"""
    try:
        # Map-match coordinates
        locations = [request.pickup] + request.stops + [request.dropoff]
        
        # If detailed steps are requested, use enhanced algorithms
        if request.detailed_steps:
            # Prepare location data for enhanced algorithms
            location_data = [{"id": f"loc_{i}", "lat": loc.lat, "lng": loc.lng, "name": f"Location {i}"} for i, loc in enumerate(locations)]
            
            # Add names for pickup, dropoff, and stops
            if len(location_data) > 0:
                location_data[0]["name"] = "Pickup"
            if len(location_data) > 1:
                location_data[-1]["name"] = "Dropoff"
            for i in range(1, len(location_data) - 1):
                location_data[i]["name"] = f"Stop {i}"
            
            # Solve using enhanced algorithms with step-by-step execution
            # Keep only the two most contrasting algorithms: Dijkstra and A*
            if request.algorithm in ["dijkstra", "astar", "auto"]:
                algorithm = request.algorithm if request.algorithm != "auto" else "dijkstra"
                enhanced_result = solve_route_with_multiple_stops(location_data, algorithm)
                
                # Try to get road network routing for better visualization
                road_network_coordinates = []
                if len(locations) == 2:
                    # For simple point-to-point, get road network route
                    osrm_result = await get_osrm_route(
                        [locations[0].lat, locations[0].lng],
                        [locations[1].lat, locations[1].lng]
                    )
                    if osrm_result:
                        road_network_coordinates = osrm_result["coordinates"]
                
                result = {
                    "route_geojson": {
                        "type": "LineString",
                        "coordinates": road_network_coordinates if road_network_coordinates else enhanced_result["coordinates"]
                    },
                    "distance_km": enhanced_result["distance_km"],
                    "eta_min": enhanced_result["eta_min"],
                    "algorithm": enhanced_result["algorithm"],
                    "steps": enhanced_result["steps"],  # Include step-by-step execution
                    "locations": location_data,  # Include location data for tree visualization
                    "execution_time_ms": enhanced_result.get("execution_time_ms", 0)  # Include execution time
                }
                
                # Add algorithm-specific stats for the selected algorithm
                if algorithm == "dijkstra":
                    result["dijkstra_stats"] = {
                        "steps_count": len(enhanced_result["steps"]),
                        "distance_km": enhanced_result["distance_km"],
                        "execution_time_ms": enhanced_result.get("execution_time_ms", 0)
                    }
                elif algorithm == "astar":
                    result["astar_stats"] = {
                        "steps_count": len(enhanced_result["steps"]),
                        "distance_km": enhanced_result["distance_km"],
                        "execution_time_ms": enhanced_result.get("execution_time_ms", 0)
                    }
                
                # If algorithm comparison is requested, run both algorithms for comprehensive comparison
                if request.show_algorithm_comparison:
                    # Run both algorithms to provide comprehensive comparison data
                    dijkstra_result = solve_route_with_multiple_stops(location_data, "dijkstra")
                    astar_result = solve_route_with_multiple_stops(location_data, "astar")
                    
                    result["dijkstra_stats"] = {
                        "steps_count": len(dijkstra_result["steps"]),
                        "distance_km": dijkstra_result["distance_km"],
                        "execution_time_ms": dijkstra_result.get("execution_time_ms", 0)
                    }
                    
                    result["astar_stats"] = {
                        "steps_count": len(astar_result["steps"]),
                        "distance_km": astar_result["distance_km"],
                        "execution_time_ms": astar_result.get("execution_time_ms", 0)
                    }
                
                return result
            else:
                # For other algorithms, use haversine distance approximation
                result = {
                    "route_geojson": {
                        "type": "LineString",
                        "coordinates": [[loc.lng, loc.lat] for loc in locations]
                    },
                    "distance_km": sum(enhanced_haversine_distance(
                        locations[i].lat, locations[i].lng,
                        locations[i+1].lat, locations[i+1].lng
                    ) for i in range(len(locations)-1)),
                    "eta_min": 30,  # Mock ETA
                    "algorithm": request.algorithm,
                    "steps": [],  # No detailed steps for other algorithms
                    "locations": location_data  # Include location data for consistency
                }
            
            return result
        else:
            # Use existing implementation for non-detailed requests
            nodes = await map_match_coordinates(locations)
            
            # For small jobs (≤ 6 stops), use direct algorithms
            if len(nodes) <= 6:
                # Get subgraph edges
                node_ids = [node["id"] for node in nodes]
                edges = await get_subgraph_edges(node_ids)
                
                # Create graph representation
                graph, node_coords = create_graph_from_edges(edges)
                
                # Select algorithm
                algorithm = request.algorithm
                if algorithm == "auto":
                    # For single pair, use A*
                    algorithm = "astar" if len(nodes) == 2 else "nn+2opt"
                
                # Compute route based on algorithm - FIXED: Handle all algorithms for direct routes
                if algorithm == "dijkstra" and len(nodes) >= 2:
                    if len(nodes) == 2:
                        # Direct route: pickup to dropoff
                        path, distance = dijkstra(graph, nodes[0]["id"], nodes[-1]["id"])
                        
                        # Try to get road network routing for better visualization
                        road_network_coordinates = []
                        osrm_result = await get_osrm_route(
                            [nodes[0]["lat"], nodes[0]["lng"]],
                            [nodes[-1]["lat"], nodes[-1]["lng"]]
                        )
                        if osrm_result:
                            road_network_coordinates = osrm_result["coordinates"]
                        
                        result = {
                            "route_geojson": {
                                "type": "LineString",
                                "coordinates": road_network_coordinates if road_network_coordinates else [[node["lng"], node["lat"]] for node in nodes]
                            },
                            "distance_km": distance,
                            "eta_min": distance * 2,  # Mock ETA calculation
                            "algorithm": "dijkstra"
                        }
                    else:
                        # Multiple stops: use simple approach
                        result = {
                            "route_geojson": {
                                "type": "LineString",
                                "coordinates": [[node["lng"], node["lat"]] for node in nodes]
                            },
                            "distance_km": sum(haversine_distance(
                                nodes[i]["lat"], nodes[i]["lng"],
                                nodes[i+1]["lat"], nodes[i+1]["lng"]
                            ) for i in range(len(nodes)-1)),
                            "eta_min": 30,  # Mock ETA
                            "algorithm": "dijkstra"
                        }
                elif algorithm == "astar" and len(nodes) >= 2:
                    if len(nodes) == 2:
                        # Direct route: pickup to dropoff
                        path, distance = astar(graph, node_coords, nodes[0]["id"], nodes[-1]["id"])
                        
                        # Try to get road network routing for better visualization
                        road_network_coordinates = []
                        osrm_result = await get_osrm_route(
                            [nodes[0]["lat"], nodes[0]["lng"]],
                            [nodes[-1]["lat"], nodes[-1]["lng"]]
                        )
                        if osrm_result:
                            road_network_coordinates = osrm_result["coordinates"]
                        
                        result = {
                            "route_geojson": {
                                "type": "LineString",
                                "coordinates": road_network_coordinates if road_network_coordinates else [[node["lng"], node["lat"]] for node in nodes]
                            },
                            "distance_km": distance,
                            "eta_min": distance * 2,  # Mock ETA calculation
                            "algorithm": "astar"
                        }
                    else:
                        # Multiple stops: use simple approach
                        result = {
                            "route_geojson": {
                                "type": "LineString",
                                "coordinates": [[node["lng"], node["lat"]] for node in nodes]
                            },
                            "distance_km": sum(haversine_distance(
                                nodes[i]["lat"], nodes[i]["lng"],
                                nodes[i+1]["lat"], nodes[i+1]["lng"]
                            ) for i in range(len(nodes)-1)),
                            "eta_min": 30,  # Mock ETA
                            "algorithm": "astar"
                        }
                elif algorithm in ["nn+2opt", "auto"] and len(nodes) > 2:
                    # Create distance matrix for TSP
                    distance_matrix = {}
                    for i, node_i in enumerate(nodes):
                        for j, node_j in enumerate(nodes):
                            if i != j:
                                key = (node_i["id"], node_j["id"])
                                # Use haversine distance as approximation
                                dist = haversine_distance(
                                    node_i["lat"], node_i["lng"],
                                    node_j["lat"], node_j["lng"]
                                )
                                distance_matrix[key] = dist
                    
                    # Solve TSP
                    tour, total_distance = nn_plus_2opt(
                        [node["id"] for node in nodes], 
                        distance_matrix
                    )
                    
                    result = {
                        "route_geojson": {
                            "type": "LineString",
                            "coordinates": [[node["lng"], node["lat"]] for node in nodes]
                        },
                        "distance_km": total_distance,
                        "eta_min": total_distance * 2,  # Mock ETA calculation
                        "algorithm": "nn+2opt"
                    }
                elif algorithm == "nn+2opt" and len(nodes) == 2:
                    # For direct route with nn+2opt, just calculate haversine distance
                    distance = haversine_distance(
                        nodes[0]["lat"], nodes[0]["lng"],
                        nodes[-1]["lat"], nodes[-1]["lng"]
                    )
                    
                    # Try to get road network routing for better visualization
                    road_network_coordinates = []
                    osrm_result = await get_osrm_route(
                        [nodes[0]["lat"], nodes[0]["lng"]],
                        [nodes[-1]["lat"], nodes[-1]["lng"]]
                    )
                    if osrm_result:
                        road_network_coordinates = osrm_result["coordinates"]
                    
                    result = {
                        "route_geojson": {
                            "type": "LineString",
                            "coordinates": road_network_coordinates if road_network_coordinates else [[node["lng"], node["lat"]] for node in nodes]
                        },
                        "distance_km": distance,
                        "eta_min": distance * 2,  # Mock ETA calculation
                        "algorithm": "nn+2opt"
                    }
                else:
                    # Fallback
                    result = {
                        "route_geojson": {
                            "type": "LineString",
                            "coordinates": [[node["lng"], node["lat"]] for node in nodes]
                        },
                        "distance_km": sum(haversine_distance(
                            nodes[i]["lat"], nodes[i]["lng"],
                            nodes[i+1]["lat"], nodes[i+1]["lng"]
                        ) for i in range(len(nodes)-1)),
                        "eta_min": 30,  # Mock ETA
                        "algorithm": "simple"
                    }
                
                return result
            else:
                # For larger jobs, we should queue them (but this is sync mode)
                raise HTTPException(
                    status_code=400,
                    detail="Too many stops for synchronous computation. Use async mode."
                )
    except Exception as e:
        print(f"Error in compute_sync_route: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Route computation failed: {str(e)}")

@app.post("/api/v1/routes/estimate", status_code=status.HTTP_200_OK)
async def estimate_route(request: RouteEstimateRequest):
    """Estimate optimal route for pickup/dropoff with optional stops"""
    
    # Validate coordinates
    if not (-90 <= request.pickup.lat <= 90) or not (-180 <= request.pickup.lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid pickup coordinates")
    
    if not (-90 <= request.dropoff.lat <= 90) or not (-180 <= request.dropoff.lng <= 180):
        raise HTTPException(status_code=400, detail="Invalid dropoff coordinates")
    
    for stop in request.stops:
        if not (-90 <= stop.lat <= 90) or not (-180 <= stop.lng <= 180):
            raise HTTPException(status_code=400, detail="Invalid stop coordinates")
    
    # Check if we should run asynchronously
    total_stops = len(request.stops)
    should_queue = request.async_mode or total_stops > 6
    
    if should_queue:
        # Queue job for async processing
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        
        # Insert job into database
        await insert_job(job_id, request.user_id, request.dict())
        
        # In a real implementation, we would enqueue to Celery here
        # For now, we'll simulate queuing
        await update_job_status(job_id, "queued", 0)
        
        # Return queued response
        return {
            "job_id": job_id,
            "status": "queued"
        }
    else:
        # Compute synchronously
        try:
            result = await compute_sync_route(request)
            return result
        except Exception as e:
            print(f"Error in estimate_route: {str(e)}")
            print(traceback.format_exc())
            raise HTTPException(status_code=500, detail=f"Route computation failed: {str(e)}")

@app.get("/api/v1/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get job status and progress"""
    # In a real implementation, this would query Supabase
    # For now, we'll return a mock response
    return JobStatusResponse(
        job_id=job_id,
        status="completed",
        progress=100
    )

@app.get("/api/v1/jobs/{job_id}/result", response_model=JobResultResponse)
async def get_job_result(job_id: str):
    """Get job result"""
    # In a real implementation, this would query Supabase
    job_data = await get_job(job_id)
    return JobResultResponse(
        job_id=job_id,
        result=job_data.get("result")
    )

@app.post("/api/v1/webhook/n8n/ack")
async def n8n_webhook_ack(request: WebhookAckRequest):
    """Receive acknowledgment from n8n webhook"""
    # Process webhook acknowledgment
    print(f"Received n8n ack for job {request.job_id} with status {request.status}")
    return {"message": "Acknowledgment received"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/api/v1/geocode")
async def geocode_location(query: str):
    """
    Geocode a location query using OpenStreetMap Nominatim API
    """
    if len(query) < 3:
        raise HTTPException(status_code=400, detail="Query must be at least 3 characters long")
    
    print(f"Geocoding request for: {query}")
    
    # Try multiple times with exponential backoff
    max_retries = 3
    for attempt in range(max_retries):
        try:
            print(f"Attempt {attempt + 1}/{max_retries} to geocode '{query}'")
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "https://nominatim.openstreetmap.org/search",
                    params={
                        "q": query,
                        "format": "json",
                        "addressdetails": 1,
                        "limit": 5  # Reduce limit to decrease load
                    },
                    headers={
                        "User-Agent": "CabRouteEstimator/1.0 (contact@cab-route-estimator.com)",
                        "Referer": "http://localhost:3000"
                    },
                    timeout=30.0  # Increase timeout to 30 seconds
                )
                
                print(f"Nominatim API response status: {response.status_code}")
                
                if response.status_code == 200:
                    results = response.json()
                    print(f"Received {len(results)} results from Nominatim")
                    # Format results for frontend
                    formatted_results = [
                        {
                            "display_name": result.get("display_name", ""),
                            "lat": float(result.get("lat", 0)) if result.get("lat") else 0,
                            "lon": float(result.get("lon", 0)) if result.get("lon") else 0,
                            "boundingbox": result.get("boundingbox", []),
                            "type": result.get("type", "")
                        }
                        for result in results[:5]  # Limit results
                    ]
                    return {"results": formatted_results}
                elif response.status_code in [403, 429, 503]:
                    # Rate limited or temporarily unavailable, wait and retry
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt  # Exponential backoff
                        print(f"Nominatim API error {response.status_code}, retrying in {wait_time} seconds...")
                        await asyncio.sleep(wait_time)
                        continue
                    else:
                        # Return mock data as fallback after all retries exhausted
                        print(f"Nominatim API error {response.status_code} after {max_retries} attempts, returning mock data")
                        return create_mock_results(query)
                else:
                    print(f"Nominatim API error: {response.status_code} - {response.text}")
                    # Return mock data as fallback
                    return create_mock_results(query)
                    
        except httpx.TimeoutException:
            print(f"HTTP timeout error on attempt {attempt + 1} for query '{query}'")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
            else:
                # Return mock data as fallback
                print(f"Geocoding failed after {max_retries} attempts due to timeout, returning mock data for '{query}'")
                return create_mock_results(query)
        except httpx.NetworkError as e:
            print(f"Network error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
            else:
                # Return mock data as fallback
                print(f"Geocoding failed after {max_retries} attempts due to network error, returning mock data for '{query}'")
                return create_mock_results(query)
        except httpx.RequestError as e:
            print(f"HTTP request error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
            else:
                # Return mock data as fallback
                print(f"Geocoding failed after {max_retries} attempts, returning mock data for '{query}'")
                return create_mock_results(query)
        except ValueError as e:
            print(f"Value error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Invalid response from geocoding service: {str(e)}")
        except Exception as e:
            print(f"Unexpected error in geocode_location: {str(e)}")
            print(traceback.format_exc())
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt  # Exponential backoff
                print(f"Waiting {wait_time} seconds before retry...")
                await asyncio.sleep(wait_time)
                continue
            else:
                # Return mock data as fallback
                print(f"Geocoding failed after {max_retries} attempts, returning mock data for '{query}'")
                return create_mock_results(query)
    
    # This should never be reached, but just in case
    print(f"Geocoding unexpectedly reached fallback, returning mock data for '{query}'")
    return create_mock_results(query)

@app.get("/api/v1/geocode/test")
async def test_geocode_connection():
    """
    Test connection to the geocoding service
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": "Bangalore",
                    "format": "json",
                    "limit": 1
                },
                headers={
                    "User-Agent": "CabRouteEstimator/1.0 (contact@cab-route-estimator.com)",
                    "Referer": "http://localhost:3000"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                return {"status": "success", "message": "Connection to Nominatim API successful"}
            else:
                return {"status": "error", "message": f"API returned status {response.status_code}", "details": response.text}
    except Exception as e:
        return {"status": "error", "message": f"Connection failed: {str(e)}"}

def create_mock_results(query: str) -> Dict[str, Any]:
    """Create mock geocoding results"""
    # Create more varied mock results based on the query
    base_locations = [
        {"name": "Bangalore, India", "lat": 12.9716, "lng": 77.5946},
        {"name": "Koramangala, Bangalore", "lat": 12.9352, "lng": 77.6245},
        {"name": "JP Nagar, Bangalore", "lat": 12.9352, "lng": 77.5946},
        {"name": "Indiranagar, Bangalore", "lat": 12.9716, "lng": 77.6245},
        {"name": "Whitefield, Bangalore", "lat": 12.9716, "lng": 77.7490},
    ]
    
    # Try to match the query with a relevant location
    query_lower = query.lower()
    matched_location = None
    for loc in base_locations:
        if loc["name"].lower() in query_lower or query_lower in loc["name"].lower():
            matched_location = loc
            break
    
    # If no match found, use a default
    if not matched_location:
        matched_location = base_locations[0]
    
    mock_results = [
        {
            "display_name": f"{matched_location['name']} (Mock Result)",
            "lat": matched_location["lat"],
            "lon": matched_location["lng"],
            "boundingbox": [],
            "type": "city"
        }
    ]
    return {"results": mock_results}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("FASTAPI_PORT", 8000))
    uvicorn.run("app:app", host="127.0.0.1", port=port, reload=True)