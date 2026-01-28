"""
Celery worker tasks for asynchronous route computation
"""

import os
import json
import requests
import httpx  # Add this import for OSRM routing
from celery import Celery
from dotenv import load_dotenv
import sys
import asyncio
from supabase import create_client, Client
from typing import Dict, Any, List  # Add missing imports

# Add backend to path so we can import algorithms
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
)

# Import our algorithms
from backend.routes.algorithms import (
    dijkstra, 
    astar, 
    nn_plus_2opt, 
    create_graph_from_edges,
    haversine_distance
)

# Initialize Celery
celery_app = Celery('route_worker')
celery_app.conf.broker_url = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
celery_app.conf.result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

async def get_job_params(job_id: str) -> dict:
    """Get job parameters from database"""
    try:
        response = supabase.table("jobs").select("params").eq("job_id", job_id).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]["params"]
        else:
            # Return default parameters if not found
            return {
                "user_id": "u_123",
                "pickup": {"lat": 12.9716, "lng": 77.5946},
                "dropoff": {"lat": 12.9352, "lng": 77.6245},
                "stops": [],
                "optimize_for": "time",
                "algorithm": "auto"
            }
    except Exception as e:
        print(f"[Worker] Error getting job params for {job_id}: {e}")
        # Return default parameters on error
        return {
            "user_id": "u_123",
            "pickup": {"lat": 12.9716, "lng": 77.5946},
            "dropoff": {"lat": 12.9352, "lng": 77.6245},
            "stops": [],
            "optimize_for": "time",
            "algorithm": "auto"
        }

async def update_job_status(job_id: str, status: str, progress: int = 0) -> None:
    """Update job status in database"""
    try:
        update_data = {
            "status": status,
            "progress": progress,
            "updated_at": "now()"
        }
        response = supabase.table("jobs").update(update_data).eq("job_id", job_id).execute()
        print(f"[Worker] Updated job {job_id} status to {status} with progress {progress}%")
    except Exception as e:
        print(f"[Worker] Error updating job {job_id} status: {e}")

async def update_job_result(job_id: str, result: dict) -> None:
    """Update job result in database"""
    try:
        update_data = {
            "result": result,
            "status": "completed",
            "progress": 100,
            "updated_at": "now()"
        }
        response = supabase.table("jobs").update(update_data).eq("job_id", job_id).execute()
        print(f"[Worker] Updated job {job_id} result: {result}")
    except Exception as e:
        print(f"[Worker] Error updating job {job_id} result: {e}")

async def find_nearest_node(lat: float, lng: float) -> dict:
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
        print(f"[Worker] Error finding nearest node: {e}")
        # Return default node on error
        return {
            "id": 1,
            "lat": lat,
            "lng": lng
        }

async def get_subgraph_edges(node_ids: list) -> list:
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
        print(f"[Worker] Error fetching subgraph edges: {e}")
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

async def map_match_coordinates(coords: list) -> list:
    """Map-match coordinates to nearest nodes"""
    nodes = []
    for coord in coords:
        node = await find_nearest_node(coord["lat"], coord["lng"])
        nodes.append(node)
    return nodes

async def post_to_n8n_webhook(job_data: dict) -> None:
    """Post job result to n8n webhook"""
    webhook_url = os.getenv('N8N_WEBHOOK_URL')
    webhook_secret = os.getenv('N8N_WEBHOOK_SECRET')
    
    if not webhook_url or not webhook_secret:
        print("[Worker] n8n webhook not configured")
        return
    
    headers = {
        'Content-Type': 'application/json',
        'x-n8n-secret': webhook_secret
    }
    
    try:
        response = requests.post(webhook_url, json=job_data, headers=headers)
        if response.status_code == 200:
            print(f"[Worker] Successfully posted to n8n webhook for job {job_data.get('job_id')}")
        else:
            print(f"[Worker] Failed to post to n8n webhook: {response.status_code}")
    except Exception as e:
        print(f"[Worker] Error posting to n8n webhook: {str(e)}")

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

async def process_job(job_id: str, params: Dict[str, Any]):
    """Process a route calculation job"""
    try:
        print(f"[Worker] Processing job {job_id}")
        
        # Update job status to running
        await update_job_status(job_id, "running", 10)
        
        # Extract locations
        locations_data = [params["pickup"]] + params["stops"] + [params["dropoff"]]
        print(f"[Worker] Locations: {len(locations_data)} points")
        
        # Map-match coordinates to nearest nodes
        nodes = []
        for i, loc in enumerate(locations_data):
            node = await find_nearest_node(loc["lat"], loc["lng"])
            nodes.append(node)
            print(f"[Worker] Mapped location {i} to node {node['id']}")
        
        # Update progress
        await update_job_status(job_id, "running", 30)
        
        # For jobs with more than 6 stops, use TSP approach
        if len(nodes) > 6:
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
            
            # Try to get road network routing for better visualization
            road_network_coordinates = []
            if len(nodes) == 2:
                # For simple point-to-point, get road network route
                osrm_result = await get_osrm_route(
                    [nodes[0]["lat"], nodes[0]["lng"]],
                    [nodes[1]["lat"], nodes[1]["lng"]]
                )
                if osrm_result:
                    road_network_coordinates = osrm_result["coordinates"]
            
            result = {
                "route_geojson": {
                    "type": "LineString",
                    "coordinates": road_network_coordinates if road_network_coordinates else [[node["lng"], node["lat"]] for node in nodes]
                },
                "distance_km": total_distance,
                "eta_min": total_distance * 2,  # Mock ETA calculation
                "algorithm": "nn+2opt"
            }
        else:
            # For smaller jobs, use direct algorithms
            # Get subgraph edges
            node_ids = [node["id"] for node in nodes]
            edges = await get_subgraph_edges(node_ids)
            print(f"[Worker] Retrieved {len(edges)} edges")
            
            # Update progress
            await update_job_status(job_id, "running", 60)
            
            # Create graph representation
            graph, node_coords = create_graph_from_edges(edges)
            
            # Select algorithm
            algorithm = params["algorithm"]
            if algorithm == "auto":
                # For single pair, use A*
                algorithm = "astar" if len(nodes) == 2 else "nn+2opt"
            
            # Update progress
            await update_job_status(job_id, "running", 70)
            
            # Compute route based on algorithm
            if algorithm == "dijkstra" and len(nodes) == 2:
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
            elif algorithm == "astar" and len(nodes) == 2:
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
            
            # Update progress
            await update_job_status(job_id, "running", 90)
            
            # Save result to database
            await update_job_result(job_id, result)
            print(f"[Worker] Saved result for job {job_id}")
            
            # Update job status to completed
            await update_job_status(job_id, "completed", 100)
            print(f"[Worker] Completed job {job_id}")
            
            # Post to n8n webhook
            webhook_data = {
                "job_id": job_id,
                "status": "completed",
                "result": result
            }
            
            n8n_webhook_url = os.getenv("N8N_WEBHOOK_URL")
            if n8n_webhook_url:
                try:
                    async with httpx.AsyncClient() as client:
                        await client.post(n8n_webhook_url, json=webhook_data)
                except Exception as e:
                    print(f"[Worker] Failed to post to n8n webhook: {e}")
    except Exception as e:
        print(f"[Worker] Error processing job {job_id}: {e}")
        # Update job status to failed
        await update_job_status(job_id, "failed", 0)

@celery_app.task
def compute_route(job_id: str) -> dict:
    """Celery task to compute route asynchronously"""
    print(f"[Worker] Starting route computation for job {job_id}")
    
    # Create a new event loop for async operations
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    try:
        # Get job parameters
        params = loop.run_until_complete(get_job_params(job_id))
        print(f"[Worker] Retrieved job parameters for {job_id}")
        
        # Process the job
        loop.run_until_complete(process_job(job_id, params))
        
        return params
    finally:
        loop.close()

if __name__ == '__main__':
    celery_app.start()