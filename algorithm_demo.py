"""
Cab Driver Agent - Algorithm Demonstration Script
This script demonstrates all the core algorithms used in the cab routing system.
"""

import math
import heapq
import time
from typing import Dict, List, Tuple, Set

# 1. Haversine Distance Calculation
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points on Earth.
    Returns distance in kilometers.
    """
    R = 6371  # Earth's radius in kilometers
    
    # Convert degrees to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Haversine formula
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    return R * c

# 2. Graph Representation
class Graph:
    def __init__(self):
        self.vertices: Dict[str, Dict[str, float]] = {}
    
    def add_edge(self, from_node: str, to_node: str, weight: float):
        """Add a weighted edge to the graph"""
        if from_node not in self.vertices:
            self.vertices[from_node] = {}
        if to_node not in self.vertices:
            self.vertices[to_node] = {}
        
        # Add bidirectional edge (undirected graph)
        self.vertices[from_node][to_node] = weight
        self.vertices[to_node][from_node] = weight

# 3. Dijkstra's Algorithm Implementation
def dijkstra(graph: Graph, start: str, end: str) -> Tuple[List[str], float]:
    """
    Find shortest path using Dijkstra's algorithm
    Returns (path, distance)
    """
    # Initialize distances and previous nodes
    distances = {node: float('infinity') for node in graph.vertices}
    previous = {node: None for node in graph.vertices}
    distances[start] = 0
    
    # Priority queue: (distance, node)
    pq = [(0, start)]
    visited: Set[str] = set()
    
    while pq:
        current_distance, current_node = heapq.heappop(pq)
        
        # Skip if already visited
        if current_node in visited:
            continue
            
        visited.add(current_node)
        
        # Found destination
        if current_node == end:
            break
            
        # Check neighbors
        for neighbor, weight in graph.vertices[current_node].items():
            if neighbor in visited:
                continue
                
            distance = current_distance + weight
            
            # Found shorter path
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))
    
    # Reconstruct path
    path = []
    current = end
    while current is not None:
        path.append(current)
        current = previous[current]
    path.reverse()
    
    return (path, distances[end])

# 4. A* Algorithm Implementation
def heuristic(node_coords: Dict[str, Tuple[float, float]], node: str, goal: str) -> float:
    """Calculate heuristic distance (straight-line) between two nodes"""
    x1, y1 = node_coords[node]
    x2, y2 = node_coords[goal]
    return math.sqrt((x2 - x1)**2 + (y2 - y1)**2)

def astar(graph: Graph, node_coords: Dict[str, Tuple[float, float]], start: str, goal: str) -> Tuple[List[str], float]:
    """
    Find shortest path using A* algorithm
    Returns (path, distance)
    """
    # Priority queue: (f_score, g_score, node)
    open_set = [(0, 0, start)]
    came_from: Dict[str, str] = {}
    
    # Cost from start to node
    g_score = {node: float('infinity') for node in graph.vertices}
    g_score[start] = 0
    
    # Visited nodes
    visited: Set[str] = set()
    
    while open_set:
        _, current_g, current = heapq.heappop(open_set)
        
        if current in visited:
            continue
            
        visited.add(current)
        
        # Found goal
        if current == goal:
            # Reconstruct path
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start)
            path.reverse()
            return (path, current_g)
        
        # Explore neighbors
        for neighbor, weight in graph.vertices[current].items():
            if neighbor in visited:
                continue
                
            tentative_g = current_g + weight
            
            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score = tentative_g + heuristic(node_coords, neighbor, goal)
                heapq.heappush(open_set, (f_score, tentative_g, neighbor))
    
    # No path found
    return ([], float('infinity'))

# 5. Nearest Neighbor Algorithm for TSP
def nearest_neighbor_tsp(nodes: List[str], distance_matrix: Dict[Tuple[str, str], float]) -> Tuple[List[str], float]:
    """
    Solve TSP using nearest neighbor heuristic
    Returns (tour, total_distance)
    """
    if not nodes:
        return ([], 0)
    
    unvisited = set(nodes[1:])  # Start from first node
    current = nodes[0]
    tour = [current]
    total_distance = 0
    
    while unvisited:
        nearest = min(unvisited, key=lambda x: distance_matrix.get((current, x), float('infinity')))
        total_distance += distance_matrix[(current, nearest)]
        current = nearest
        tour.append(current)
        unvisited.remove(nearest)
    
    # Return to start
    total_distance += distance_matrix.get((current, nodes[0]), 0)
    tour.append(nodes[0])
    
    return (tour, total_distance)

# 6. 2-opt Improvement for TSP
def two_opt(tour: List[str], distance_matrix: Dict[Tuple[str, str], float]) -> Tuple[List[str], float]:
    """
    Improve TSP solution using 2-opt local search
    Returns (improved_tour, improved_distance)
    """
    def calculate_tour_distance(tour_list: List[str]) -> float:
        return sum(distance_matrix.get((tour_list[i], tour_list[i+1]), 0) 
                  for i in range(len(tour_list)-1))
    
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
                    
    return (best_tour, best_distance)

# Performance timing function
def time_algorithm(func, *args):
    """Time the execution of an algorithm"""
    start = time.time()
    result = func(*args)
    end = time.time()
    return result, (end - start) * 1000  # Convert to milliseconds

# Main demonstration
def main():
    print("=" * 60)
    print("Cab Driver Agent - Algorithm Demonstrations")
    print("=" * 60)
    
    # 1. Haversine Distance Demo
    print("\n1. Haversine Distance Calculation")
    print("-" * 30)
    # Bangalore coordinates
    bangalore_lat, bangalore_lon = 12.9716, 77.5946
    # Chennai coordinates
    chennai_lat, chennai_lon = 13.0827, 80.2707
    
    distance = haversine_distance(bangalore_lat, bangalore_lon, chennai_lat, chennai_lon)
    print(f"Distance between Bangalore and Chennai: {distance:.2f} km")
    
    # 2. Graph Creation Demo
    print("\n2. Graph Representation")
    print("-" * 30)
    # Create sample graph representing city intersections
    g = Graph()
    g.add_edge("A", "B", 4)
    g.add_edge("A", "C", 2)
    g.add_edge("B", "C", 1)
    g.add_edge("B", "D", 5)
    g.add_edge("C", "D", 8)
    g.add_edge("C", "E", 10)
    g.add_edge("D", "E", 2)
    
    print("Road Network Connections:")
    for node, connections in g.vertices.items():
        print(f"  {node}: {connections}")
    
    # 3. Dijkstra's Algorithm Demo
    print("\n3. Dijkstra's Algorithm")
    print("-" * 30)
    path, distance = dijkstra(g, "A", "E")
    print(f"Shortest path from A to E: {' -> '.join(path)}")
    print(f"Total distance: {distance}")
    
    # 4. A* Algorithm Demo
    print("\n4. A* Algorithm")
    print("-" * 30)
    # Coordinates for heuristic calculation
    coords = {
        "A": (0, 0),
        "B": (1, 1),
        "C": (2, 0),
        "D": (3, 1),
        "E": (4, 0)
    }
    
    path, distance = astar(g, coords, "A", "E")
    print(f"A* path from A to E: {' -> '.join(path)}")
    print(f"Total distance: {distance}")
    
    # 5. TSP Algorithms Demo
    print("\n5. TSP Solution (Multi-stop Route Optimization)")
    print("-" * 30)
    # Sample cities
    cities = ["Warehouse", "Store A", "Store B", "Store C", "Store D"]
    
    # Distance matrix (simplified for demo)
    distances = {}
    for i, city1 in enumerate(cities):
        for j, city2 in enumerate(cities):
            if i != j:
                # Generate realistic distances
                distance = abs(i - j) * 5 + 2
                distances[(city1, city2)] = distance
    
    # Apply nearest neighbor
    nn_tour, nn_distance = nearest_neighbor_tsp(cities, distances)
    print(f"Nearest Neighbor Route: {' -> '.join(nn_tour)}")
    print(f"Total Distance: {nn_distance}")
    
    # Improve with 2-opt
    opt_tour, opt_distance = two_opt(nn_tour, distances)
    print(f"2-opt Optimized Route: {' -> '.join(opt_tour)}")
    print(f"Optimized Distance: {opt_distance}")
    print(f"Improvement: {nn_distance - opt_distance:.2f} km saved")
    
    # 6. Performance Comparison
    print("\n6. Performance Comparison")
    print("-" * 30)
    # Create a larger graph for meaningful timing
    large_graph = Graph()
    nodes = [chr(65 + i) for i in range(10)]  # A-J
    for i in range(len(nodes) - 1):
        large_graph.add_edge(nodes[i], nodes[i+1], i + 1)
        if i < len(nodes) - 2:
            large_graph.add_edge(nodes[i], nodes[i+2], i + 3)
    
    # Coordinates for A* heuristic
    large_coords = {node: (i, i % 3) for i, node in enumerate(nodes)}
    
    # Time both algorithms
    dijkstra_result, dijkstra_time = time_algorithm(dijkstra, large_graph, "A", "J")
    astar_result, astar_time = time_algorithm(astar, large_graph, large_coords, "A", "J")
    
    print(f"Dijkstra: {dijkstra_time:.4f} ms, Path: {' -> '.join(dijkstra_result[0])}")
    print(f"A*:       {astar_time:.4f} ms, Path: {' -> '.join(astar_result[0])}")
    if astar_time > 0:
        print(f"Speedup:  {dijkstra_time/astar_time:.2f}x faster")
    
    print("\n" + "=" * 60)
    print("Demonstration Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()