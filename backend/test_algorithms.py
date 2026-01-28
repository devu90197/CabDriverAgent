"""
Test script for the enhanced pathfinding algorithms
"""

import sys
import os

# Add the routes directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'routes'))

from enhanced_algorithms import solve_route_with_multiple_stops, create_realistic_graph, haversine_distance

def test_algorithms_with_complex_graph():
    """Test the enhanced algorithms with a more complex scenario"""
    
    print("=== COMPLEX SCENARIO TEST ===")
    
    # Create a more complex set of locations that will better demonstrate algorithm differences
    locations = [
        {"id": "start", "lat": 12.9716, "lng": 77.5946},      # Bangalore Central
        {"id": "point_a", "lat": 12.95, "lng": 77.6},         # Intermediate point
        {"id": "point_b", "lat": 12.94, "lng": 77.61},        # Another intermediate
        {"id": "point_c", "lat": 12.96, "lng": 77.58},        # Detour point
        {"id": "point_d", "lat": 12.93, "lng": 77.62},        # Another point
        {"id": "end", "lat": 12.9352, "lng": 77.6245}         # Destination
    ]
    
    print(f"Testing with {len(locations)} locations")
    
    # Show the graph structure
    graph, node_coords = create_realistic_graph(locations)
    print("\nGraph structure (each node connected to nearest neighbors only):")
    for node_id in sorted(graph.keys()):
        neighbors = graph[node_id]
        neighbor_names = []
        for neighbor_id, distance in neighbors:
            # Make sure neighbor_id is an integer
            neighbor_id = int(neighbor_id)
            if neighbor_id < len(locations):
                neighbor_names.append(f"{locations[neighbor_id]['id']}({distance:.2f}km)")
        print(f"  Node {node_id} ({locations[node_id]['id']}) connects to: {neighbor_names}")
    
    # Test Dijkstra
    print("\n--- Dijkstra Algorithm ---")
    result_dijkstra = solve_route_with_multiple_stops(locations, "dijkstra")
    print(f"Algorithm: {result_dijkstra['algorithm']}")
    print(f"Total Distance: {result_dijkstra['distance_km']:.2f} km")
    print(f"ETA: {result_dijkstra['eta_min']:.0f} minutes")
    print(f"Steps executed: {len(result_dijkstra['steps'])}")
    
    # Show path
    path_names = []
    for node_id in result_dijkstra['complete_path']:
        if node_id < len(locations):
            path_names.append(locations[node_id]['id'])
    print(f"Path: {' -> '.join(path_names)}")
    
    # Test A*
    print("\n--- A* Algorithm ---")
    result_astar = solve_route_with_multiple_stops(locations, "astar")
    print(f"Algorithm: {result_astar['algorithm']}")
    print(f"Total Distance: {result_astar['distance_km']:.2f} km")
    print(f"ETA: {result_astar['eta_min']:.0f} minutes")
    print(f"Steps executed: {len(result_astar['steps'])}")
    
    # Show path
    path_names = []
    for node_id in result_astar['complete_path']:
        if node_id < len(locations):
            path_names.append(locations[node_id]['id'])
    print(f"Path: {' -> '.join(path_names)}")
    
    # Compare the number of steps and final paths
    print("\n=== COMPARISON ===")
    print(f"Dijkstra explored {len(result_dijkstra['steps'])} steps")
    print(f"A* explored {len(result_astar['steps'])} steps")
    print(f"Distance difference: {abs(result_dijkstra['distance_km'] - result_astar['distance_km']):.4f} km")
    
    # Show first few steps of each algorithm to highlight differences
    print("\n=== STEP-BY-STEP DIFFERENCES ===")
    print("Dijkstra (first 3 steps):")
    for i, step in enumerate(result_dijkstra['steps'][:3]):
        print(f"  Step {step['step_number']}: {step['description']}")
    
    print("\nA* (first 3 steps):")
    for i, step in enumerate(result_astar['steps'][:3]):
        print(f"  Step {step['step_number']}: {step['description']}")

def test_simple_direct_comparison():
    """Test with a simple case to show the fundamental difference"""
    
    print("\n\n=== SIMPLE DIRECT COMPARISON ===")
    
    # Simple case with 4 points in a line
    locations = [
        {"id": "source", "lat": 12.9716, "lng": 77.5946},
        {"id": "mid1", "lat": 12.96, "lng": 77.60},
        {"id": "mid2", "lat": 12.95, "lng": 77.61},
        {"id": "target", "lat": 12.94, "lng": 77.62}
    ]
    
    print(f"Locations: {[loc['id'] for loc in locations]}")
    
    # Test both algorithms
    result_dijkstra = solve_route_with_multiple_stops(locations, "dijkstra")
    result_astar = solve_route_with_multiple_stops(locations, "astar")
    
    print(f"\nDijkstra steps: {len(result_dijkstra['steps'])}")
    print(f"A* steps: {len(result_astar['steps'])}")
    
    if len(result_dijkstra['steps']) > len(result_astar['steps']):
        print("✓ A* was more efficient (explored fewer nodes)")
    elif len(result_dijkstra['steps']) < len(result_astar['steps']):
        print("✓ Dijkstra was more efficient (unexpected)")
    else:
        print("• Both algorithms explored the same number of nodes")

if __name__ == "__main__":
    test_algorithms_with_complex_graph()
    test_simple_direct_comparison()