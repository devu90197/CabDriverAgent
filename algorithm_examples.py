"""
Cab Driver Agent - Algorithm Examples
This file demonstrates the core algorithms used in the cab routing system.
"""

import math
import heapq
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

# Example usage of Haversine
def demo_haversine():
    print("=== Haversine Distance Demo ===")
    # Bangalore coordinates
    bangalore_lat, bangalore_lon = 12.9716, 77.5946
    # Chennai coordinates
    chennai_lat, chennai_lon = 13.0827, 80.2707
    
    distance = haversine_distance(bangalore_lat, bangalore_lon, chennai_lat, chennai_lon)
    print(f"Distance between Bangalore and Chennai: {distance:.2f} km")

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

# Example usage of Dijkstra
def demo_dijkstra():
    print("\n=== Dijkstra's Algorithm Demo ===")
    
    # Create sample graph representing city intersections
    g = Graph()
    g.add_edge("A", "B", 4)
    g.add_edge("A", "C", 2)
    g.add_edge("B", "C", 1)
    g.add_edge("B", "D", 5)
    g.add_edge("C", "D", 8)
    g.add_edge("C", "E", 10)
    g.add_edge("D", "E", 2)
    
    path, distance = dijkstra(g, "A", "E")
    print(f"Shortest path from A to E: {' -> '.join(path)}")
    print(f"Total distance: {distance}")

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

# Example usage of A*
def demo_astar():
    print("\n=== A* Algorithm Demo ===")
    
    # Create sample graph
    g = Graph()
    g.add_edge("A", "B", 1)
    g.add_edge("A", "C", 4)
    g.add_edge("B", "C", 2)
    g.add_edge("B", "D", 5)
    g.add_edge("C", "D", 1)
    
    # Coordinates for heuristic calculation
    coords = {
        "A": (0, 0),
        "B": (1, 1),
        "C": (2, 0),
        "D": (3, 1)
    }
    
    path, distance = astar(g, coords, "A", "D")
    print(f"A* path from A to D: {' -> '.join(path)}")
    print(f"Total distance: {distance}")

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

# Example usage of TSP algorithms
def demo_tsp():
    print("\n=== TSP Algorithms Demo ===")
    
    # Sample cities
    cities = ["A", "B", "C", "D"]
    
    # Distance matrix
    distances = {
        ("A", "B"): 10, ("A", "C"): 15, ("A", "D"): 20,
        ("B", "A"): 10, ("B", "C"): 35, ("B", "D"): 25,
        ("C", "A"): 15, ("C", "B"): 35, ("C", "D"): 30,
        ("D", "A"): 20, ("D", "B"): 25, ("D", "C"): 30
    }
    
    # Apply nearest neighbor
    nn_tour, nn_distance = nearest_neighbor_tsp(cities, distances)
    print(f"Nearest Neighbor Tour: {' -> '.join(nn_tour)}")
    print(f"Distance: {nn_distance}")
    
    # Improve with 2-opt
    opt_tour, opt_distance = two_opt(nn_tour, distances)
    print(f"2-opt Improved Tour: {' -> '.join(opt_tour)}")
    print(f"Improved Distance: {opt_distance}")

# Main demonstration
if __name__ == "__main__":
    print("Cab Driver Agent - Algorithm Demonstrations")
    print("=" * 50)
    
    demo_haversine()
    demo_dijkstra()
    demo_astar()
    demo_tsp()
    
    print("\n" + "=" * 50)
    print("All demonstrations completed!")