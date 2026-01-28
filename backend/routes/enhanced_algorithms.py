"""
Enhanced Route optimization algorithms implementation with step-by-step execution tracking:
- Dijkstra's algorithm for shortest path with detailed traversal logging
- A* algorithm with heuristic and detailed traversal logging
- Support for multiple intermediate stops
"""

import heapq
import math
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class AlgorithmStep:
    """Represents a single step in algorithm execution"""
    step_number: int
    current_node: int
    visited_nodes: List[int]
    frontier_nodes: List[Tuple[float, int]]  # (priority, node)
    distances: Dict[int, float]
    previous_nodes: Dict[int, int]
    description: str
    timestamp: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with JSON-serializable values"""
        # Handle infinity values in distances
        json_distances = {}
        for k, v in self.distances.items():
            if isinstance(v, float) and (v == float('inf') or v == float('-inf')):
                # Convert infinity to a large finite number or string representation
                json_distances[int(k)] = 999999.0 if v > 0 else -999999.0
            else:
                json_distances[int(k)] = float(v)
        
        return {
            "step_number": self.step_number,
            "current_node": self.current_node,
            "visited_nodes": self.visited_nodes,
            "frontier_nodes": [[float(priority), int(node)] for priority, node in self.frontier_nodes],
            "distances": json_distances,  # Use the sanitized distances
            "previous_nodes": {int(k): int(v) for k, v in self.previous_nodes.items()},
            "description": self.description,
            "timestamp": self.timestamp
        }


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians 
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula 
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a)) 
    r = 6371  # Radius of earth in kilometers
    return c * r


def dijkstra_with_steps(
    graph: Dict[int, List[Tuple[int, float]]], 
    start: int, 
    end: int,
    node_coords: Dict[int, Tuple[float, float]] = None
) -> Tuple[List[int], float, List[AlgorithmStep]]:
    """
    Dijkstra's algorithm implementation with step-by-step execution tracking
    
    Args:
        graph: adjacency list representation {node: [(neighbor, weight), ...]}
        start: start node
        end: end node
        node_coords: {node: (lat, lng)} for visualization (optional)
        
    Returns:
        (path, distance, steps) tuple
    """
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    previous = {}
    pq = [(0, start)]
    visited = set()
    steps: List[AlgorithmStep] = []
    step_count = 0
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
            
        visited.add(current_node)
        
        # Record step
        step_count += 1
        step = AlgorithmStep(
            step_number=step_count,
            current_node=current_node,
            visited_nodes=list(visited),
            frontier_nodes=[(d, n) for d, n in pq],
            distances=dict(distances),
            previous_nodes=dict(previous),
            description=f"Visiting node {current_node}. Current distance: {current_distance:.2f} km",
            timestamp=datetime.now().isoformat()
        )
        steps.append(step)
        
        if current_node == end:
            break
            
        for neighbor, weight in graph.get(current_node, []):
            distance = current_distance + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))
                
                # Record exploration step
                step_count += 1
                explore_step = AlgorithmStep(
                    step_number=step_count,
                    current_node=current_node,
                    visited_nodes=list(visited),
                    frontier_nodes=[(d, n) for d, n in pq],
                    distances=dict(distances),
                    previous_nodes=dict(previous),
                    description=f"Exploring neighbor {neighbor} from node {current_node}. New distance: {distance:.2f} km",
                    timestamp=datetime.now().isoformat()
                )
                steps.append(explore_step)
    
    # Reconstruct path
    path = []
    current = end
    while current in previous:
        path.append(current)
        current = previous[current]
    path.append(start)
    path.reverse()
    
    return path, distances[end], steps


def astar_with_steps(
    graph: Dict[int, List[Tuple[int, float]]], 
    node_coords: Dict[int, Tuple[float, float]], 
    start: int, 
    end: int
) -> Tuple[List[int], float, List[AlgorithmStep]]:
    """
    A* algorithm implementation with step-by-step execution tracking
    
    Args:
        graph: adjacency list representation {node: [(neighbor, weight), ...]}
        node_coords: {node: (lat, lng)} for heuristic calculation
        start: start node
        end: end node
        
    Returns:
        (path, distance, steps) tuple
    """
    def heuristic(node1: int, node2: int) -> float:
        """Calculate heuristic distance between two nodes"""
        lat1, lng1 = node_coords[node1]
        lat2, lng2 = node_coords[node2]
        return haversine_distance(lat1, lng1, lat2, lng2)
    
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    previous = {}
    pq = [(0, start)]
    visited = set()
    steps: List[AlgorithmStep] = []
    step_count = 0
    
    while pq:
        current_priority, current_node = heapq.heappop(pq)
        current_distance = distances[current_node]
        
        if current_node in visited:
            continue
            
        visited.add(current_node)
        
        # Record step
        step_count += 1
        step = AlgorithmStep(
            step_number=step_count,
            current_node=current_node,
            visited_nodes=list(visited),
            frontier_nodes=[(p, n) for p, n in pq],
            distances=dict(distances),
            previous_nodes=dict(previous),
            description=f"Visiting node {current_node}. Priority: {current_priority:.2f}, Actual distance: {current_distance:.2f} km, Heuristic to goal: {heuristic(current_node, end):.2f} km",
            timestamp=datetime.now().isoformat()
        )
        steps.append(step)
        
        if current_node == end:
            break
            
        for neighbor, weight in graph.get(current_node, []):
            distance = distances[current_node] + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                priority = distance + heuristic(neighbor, end)
                heapq.heappush(pq, (priority, neighbor))
                
                # Record exploration step
                step_count += 1
                explore_step = AlgorithmStep(
                    step_number=step_count,
                    current_node=current_node,
                    visited_nodes=list(visited),
                    frontier_nodes=[(p, n) for p, n in pq],
                    distances=dict(distances),
                    previous_nodes=dict(previous),
                    description=f"Exploring neighbor {neighbor} from node {current_node}. New distance: {distance:.2f} km, Priority: {priority:.2f} km",
                    timestamp=datetime.now().isoformat()
                )
                steps.append(explore_step)
    
    # Reconstruct path
    path = []
    current = end
    while current in previous:
        path.append(current)
        current = previous[current]
    path.append(start)
    path.reverse()
    
    return path, distances[end], steps


def create_realistic_graph(locations: List[Dict[str, Any]]) -> Tuple[Dict[int, List[Tuple[int, float]]], Dict[int, Tuple[float, float]]]:
    """
    Create a more realistic graph where nodes are connected to nearby nodes only,
    not to all nodes. This will make A* and Dijkstra produce different results.
    """
    graph = {}
    node_coords = {}
    
    # Create nodes
    for i, loc in enumerate(locations):
        node_id = i
        node_coords[node_id] = (loc['lat'], loc['lng'])
        graph[node_id] = []
    
    # Connect each node to its nearest neighbors only
    for i in range(len(locations)):
        distances_to_others = []
        for j in range(len(locations)):
            if i != j:
                distance = haversine_distance(
                    locations[i]['lat'], locations[i]['lng'],
                    locations[j]['lat'], locations[j]['lng']
                )
                distances_to_others.append((distance, j))
        
        # Sort by distance and connect to nearest 2-3 neighbors
        distances_to_others.sort()
        num_connections = min(3, len(distances_to_others))  # Connect to at most 3 nearest neighbors
        
        for k in range(num_connections):
            distance, neighbor_id = distances_to_others[k]
            # Make sure neighbor_id is an integer
            neighbor_id = int(neighbor_id)
            graph[i].append((neighbor_id, distance))
    
    return graph, node_coords


def solve_route_with_multiple_stops(
    locations: List[Dict[str, Any]],  # List of {id, lat, lng}
    algorithm: str = "dijkstra"  # "dijkstra" or "astar"
) -> Dict[str, Any]:
    """
    Solve route with multiple stops using specified algorithm
    
    Args:
        locations: List of locations in order [pickup, stop1, stop2, ..., dropoff]
        algorithm: Algorithm to use ("dijkstra", "astar")
        
    Returns:
        Dictionary with route information and algorithm steps
    """
    if len(locations) < 2:
        raise ValueError("Need at least pickup and dropoff locations")
    
    # Create a more realistic graph where nodes are only connected to nearby nodes
    graph, node_coords = create_realistic_graph(locations)
    location_map = {loc['id']: i for i, loc in enumerate(locations)}
    
    # Determine start and end nodes
    start_node = location_map[locations[0]['id']]
    end_node = location_map[locations[-1]['id']]
    
    import time
    start_time = time.time()
    
    # For multiple stops, we need to visit them in order
    if len(locations) > 2:
        # Create path segments: pickup -> stop1 -> stop2 -> ... -> dropoff
        segments = []
        steps_collection = []
        total_distance = 0
        complete_path = [start_node]
        
        # Process each segment
        for i in range(len(locations) - 1):
            segment_start = location_map[locations[i]['id']]
            segment_end = location_map[locations[i+1]['id']]
            
            if algorithm == "astar":
                path_segment, segment_distance, steps = astar_with_steps(
                    graph, node_coords, segment_start, segment_end
                )
            else:  # dijkstra
                path_segment, segment_distance, steps = dijkstra_with_steps(
                    graph, segment_start, segment_end, node_coords
                )
            
            segments.append({
                "from": locations[i]['id'],
                "to": locations[i+1]['id'],
                "path": path_segment,
                "distance_km": segment_distance,
                "steps": [step.to_dict() for step in steps]
            })
            
            steps_collection.extend(steps)
            total_distance += segment_distance
            
            # Add segment path to complete path (avoid duplicating nodes)
            if i == 0:
                complete_path.extend(path_segment[1:])
            else:
                complete_path.extend(path_segment[1:])
        
        # Convert node IDs back to coordinates for GeoJSON
        coordinates = []
        for node_id in complete_path:
            lat, lng = node_coords[node_id]
            coordinates.append([lng, lat])  # GeoJSON format [longitude, latitude]
        
        end_time = time.time()
        execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        return {
            "algorithm": algorithm,
            "segments": segments,
            "complete_path": complete_path,
            "coordinates": coordinates,
            "distance_km": total_distance,
            "eta_min": total_distance * 2,  # Simple estimation
            "steps": [step.to_dict() for step in steps_collection],
            "execution_time_ms": execution_time
        }
    else:
        # Direct route from pickup to dropoff
        if algorithm == "astar":
            path, distance, steps = astar_with_steps(
                graph, node_coords, start_node, end_node
            )
        else:  # dijkstra
            path, distance, steps = dijkstra_with_steps(
                graph, start_node, end_node, node_coords
            )
        
        # Convert node IDs back to coordinates for GeoJSON
        coordinates = []
        for node_id in path:
            lat, lng = node_coords[node_id]
            coordinates.append([lng, lat])  # GeoJSON format [longitude, latitude]
        
        end_time = time.time()
        execution_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        return {
            "algorithm": algorithm,
            "path": path,
            "coordinates": coordinates,
            "distance_km": distance,
            "eta_min": distance * 2,  # Simple estimation
            "steps": [step.to_dict() for step in steps],
            "execution_time_ms": execution_time
        }


# Example usage and testing
if __name__ == "__main__":
    # Test with sample data
    locations = [
        {"id": "pickup", "lat": 12.9716, "lng": 77.5946},
        {"id": "stop1", "lat": 12.95, "lng": 77.6},
        {"id": "dropoff", "lat": 12.9352, "lng": 77.6245}
    ]
    
    # Test Dijkstra
    print("=== DIJKSTRA ALGORITHM ===")
    result_dijkstra = solve_route_with_multiple_stops(locations, "dijkstra")
    print(f"Total distance: {result_dijkstra['distance_km']:.2f} km")
    print(f"ETA: {result_dijkstra['eta_min']:.0f} minutes")
    print(f"Algorithm steps: {len(result_dijkstra['steps'])}")
    
    # Test A*
    print("\n=== A* ALGORITHM ===")
    result_astar = solve_route_with_multiple_stops(locations, "astar")
    print(f"Total distance: {result_astar['distance_km']:.2f} km")
    print(f"ETA: {result_astar['eta_min']:.0f} minutes")
    print(f"Algorithm steps: {len(result_astar['steps'])}")
    
    # Print first few steps of Dijkstra for demonstration
    print("\n=== DIJKSTRA STEP-BY-STEP EXECUTION ===")
    for i, step in enumerate(result_dijkstra['steps'][:5]):  # Show first 5 steps
        print(f"Step {step['step_number']}: {step['description']}")