"""
Route optimization algorithms implementation:
- Dijkstra's algorithm for shortest path
- A* algorithm with heuristic
- Nearest Neighbor heuristic for TSP
- 2-opt improvement for TSP
"""

import heapq
import math
from typing import List, Tuple, Dict, Any, Optional


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


def dijkstra(graph: Dict[int, List[Tuple[int, float]]], start: int, end: int) -> Tuple[List[int], float]:
    """
    Dijkstra's algorithm implementation for finding shortest path
    Args:
        graph: adjacency list representation {node: [(neighbor, weight), ...]}
        start: start node
        end: end node
    Returns:
        (path, distance) tuple
    """
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    previous = {}
    pq = [(0, start)]
    visited = set()
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
            
        visited.add(current_node)
        
        if current_node == end:
            break
            
        for neighbor, weight in graph.get(current_node, []):
            distance = current_distance + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))
    
    # Reconstruct path
    path = []
    current = end
    while current in previous:
        path.append(current)
        current = previous[current]
    path.append(start)
    path.reverse()
    
    return path, distances[end]


def astar(graph: Dict[int, List[Tuple[int, float]]], 
          node_coords: Dict[int, Tuple[float, float]], 
          start: int, 
          end: int) -> Tuple[List[int], float]:
    """
    A* algorithm implementation
    Args:
        graph: adjacency list representation {node: [(neighbor, weight), ...]}
        node_coords: {node: (lat, lng)} for heuristic calculation
        start: start node
        end: end node
    Returns:
        (path, distance) tuple
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
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
            
        visited.add(current_node)
        
        if current_node == end:
            break
            
        for neighbor, weight in graph.get(current_node, []):
            distance = current_distance + weight
            
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                priority = distance + heuristic(neighbor, end)
                heapq.heappush(pq, (priority, neighbor))
    
    # Reconstruct path
    path = []
    current = end
    while current in previous:
        path.append(current)
        current = previous[current]
    path.append(start)
    path.reverse()
    
    return path, distances[end]


def nearest_neighbor(nodes: List[int], 
                    distance_matrix: Dict[Tuple[int, int], float]) -> Tuple[List[int], float]:
    """
    Nearest Neighbor heuristic for TSP
    Args:
        nodes: list of node IDs (first node is starting point)
        distance_matrix: {(node_i, node_j): distance}
    Returns:
        (tour, total_distance) tuple
    """
    if len(nodes) <= 1:
        return nodes, 0
    
    unvisited = set(nodes[1:])  # All nodes except start
    current = nodes[0]
    tour = [current]
    total_distance = 0
    
    while unvisited:
        nearest = min(unvisited, key=lambda x: distance_matrix.get((current, x), float('inf')))
        total_distance += distance_matrix.get((current, nearest), float('inf'))
        current = nearest
        tour.append(current)
        unvisited.remove(nearest)
    
    # Return to start
    total_distance += distance_matrix.get((current, nodes[0]), float('inf'))
    tour.append(nodes[0])
    
    return tour, total_distance


def two_opt(tour: List[int], 
           distance_matrix: Dict[Tuple[int, int], float]) -> Tuple[List[int], float]:
    """
    2-opt improvement heuristic for TSP
    Args:
        tour: initial tour
        distance_matrix: {(node_i, node_j): distance}
    Returns:
        (improved_tour, total_distance) tuple
    """
    def calculate_tour_distance(tour_list: List[int]) -> float:
        """Calculate total distance of tour"""
        total = 0
        for i in range(len(tour_list) - 1):
            total += distance_matrix.get((tour_list[i], tour_list[i+1]), float('inf'))
        return total
    
    best_tour = tour[:]
    best_distance = calculate_tour_distance(best_tour)
    improved = True
    
    while improved:
        improved = False
        for i in range(1, len(best_tour) - 2):
            for j in range(i + 1, len(best_tour)):
                if j - i == 1:
                    continue  # Skip adjacent edges
                    
                # Create new tour by reversing segment between i and j
                new_tour = best_tour[:]
                new_tour[i:j] = reversed(new_tour[i:j])
                
                new_distance = calculate_tour_distance(new_tour)
                
                if new_distance < best_distance:
                    best_tour = new_tour
                    best_distance = new_distance
                    improved = True
                    
    return best_tour, best_distance


def create_graph_from_edges(edges: List[Dict[str, Any]]) -> Tuple[
    Dict[int, List[Tuple[int, float]]], 
    Dict[int, Tuple[float, float]]
]:
    """
    Create graph representation from edges data
    Args:
        edges: list of edge dictionaries with from_node, to_node, distance_km
    Returns:
        (graph, node_coords) tuple
    """
    graph = {}
    node_coords = {}
    
    # First pass: collect all nodes and their coordinates
    for edge in edges:
        from_node = edge['from_node']
        to_node = edge['to_node']
        
        # Initialize graph entries
        if from_node not in graph:
            graph[from_node] = []
        if to_node not in graph:
            graph[to_node] = []
            
        # Add edge to graph
        graph[from_node].append((to_node, edge['distance_km']))
        
        # Store coordinates if available
        if 'from_lat' in edge and 'from_lng' in edge:
            node_coords[from_node] = (edge['from_lat'], edge['from_lng'])
        if 'to_lat' in edge and 'to_lng' in edge:
            node_coords[to_node] = (edge['to_lat'], edge['to_lng'])
            
    return graph, node_coords


def nn_plus_2opt(nodes: List[int], 
                distance_matrix: Dict[Tuple[int, int], float]) -> Tuple[List[int], float]:
    """
    Combined Nearest Neighbor + 2-opt approach for TSP
    Args:
        nodes: list of node IDs
        distance_matrix: {(node_i, node_j): distance}
    Returns:
        (optimized_tour, total_distance) tuple
    """
    # Get initial solution with Nearest Neighbor
    initial_tour, _ = nearest_neighbor(nodes, distance_matrix)
    
    # Improve with 2-opt
    optimized_tour, total_distance = two_opt(initial_tour, distance_matrix)
    
    return optimized_tour, total_distance