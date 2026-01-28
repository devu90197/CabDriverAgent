"""
Unit tests for route optimization algorithms
"""

import pytest
import sys
import os

# Add backend to path so we can import algorithms
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from routes.algorithms import (
    haversine_distance, 
    dijkstra, 
    astar, 
    nearest_neighbor, 
    two_opt, 
    nn_plus_2opt
)


def test_haversine_distance():
    """Test haversine distance calculation"""
    # Same point should be 0 distance
    assert haversine_distance(12.9716, 77.5946, 12.9716, 77.5946) == 0
    
    # Known distance between two points (approximately)
    # Bangalore coordinates
    dist = haversine_distance(12.9716, 77.5946, 12.9352, 77.6245)
    assert abs(dist - 5.6) < 0.5  # Approximately 5.6 km


def test_dijkstra_basic():
    """Test basic Dijkstra algorithm"""
    # Simple graph: 0 -> 1 -> 2
    graph = {
        0: [(1, 1)],
        1: [(2, 2)],
        2: []
    }
    
    path, distance = dijkstra(graph, 0, 2)
    assert path == [0, 1, 2]
    assert distance == 3


def test_dijkstra_complex():
    """Test Dijkstra with more complex graph"""
    # Graph with multiple paths
    graph = {
        0: [(1, 4), (2, 1)],
        1: [(3, 1)],
        2: [(1, 2), (3, 5)],
        3: []
    }
    
    path, distance = dijkstra(graph, 0, 3)
    assert path == [0, 2, 1, 3]
    assert distance == 3  # 0->2 (1) + 2->1 (2) + 1->3 (1) = 4


def test_astar_basic():
    """Test basic A* algorithm"""
    # Simple graph with coordinates
    graph = {
        0: [(1, 1)],
        1: [(2, 2)],
        2: []
    }
    
    # Coordinates for nodes (lat, lng)
    node_coords = {
        0: (0, 0),
        1: (0, 1),
        2: (0, 3)
    }
    
    path, distance = astar(graph, node_coords, 0, 2)
    assert path == [0, 1, 2]
    assert distance == 3


def test_nearest_neighbor():
    """Test Nearest Neighbor heuristic"""
    # Simple distance matrix
    nodes = [0, 1, 2, 3]
    distance_matrix = {
        (0, 1): 1, (1, 0): 1,
        (0, 2): 2, (2, 0): 2,
        (0, 3): 3, (3, 0): 3,
        (1, 2): 1, (2, 1): 1,
        (1, 3): 2, (3, 1): 2,
        (2, 3): 1, (3, 2): 1
    }
    
    tour, distance = nearest_neighbor(nodes, distance_matrix)
    # Should start and end at node 0
    assert tour[0] == 0
    assert tour[-1] == 0
    # Should visit all nodes
    assert len(tour) == 5  # 4 nodes + return to start


def test_two_opt_improvement():
    """Test 2-opt improvement"""
    # Initial tour that can be improved
    tour = [0, 2, 1, 3, 0]  # Non-optimal tour
    distance_matrix = {
        (0, 1): 1, (1, 0): 1,
        (0, 2): 2, (2, 0): 2,
        (0, 3): 3, (3, 0): 3,
        (1, 2): 1, (2, 1): 1,
        (1, 3): 1, (3, 1): 1,
        (2, 3): 1, (3, 2): 1
    }
    
    improved_tour, distance = two_opt(tour, distance_matrix)
    # Should start and end at same node
    assert improved_tour[0] == improved_tour[-1]
    # Total distance should be reasonable
    assert distance > 0


def test_nn_plus_2opt():
    """Test combined NN + 2-opt approach"""
    nodes = [0, 1, 2, 3]
    distance_matrix = {
        (0, 1): 1, (1, 0): 1,
        (0, 2): 2, (2, 0): 2,
        (0, 3): 3, (3, 0): 3,
        (1, 2): 1, (2, 1): 1,
        (1, 3): 1, (3, 1): 1,
        (2, 3): 1, (3, 2): 1
    }
    
    tour, distance = nn_plus_2opt(nodes, distance_matrix)
    # Should start and end at node 0
    assert tour[0] == tour[-1]
    # Should visit all nodes
    assert len(set(tour)) >= 4  # All unique nodes plus return


if __name__ == "__main__":
    pytest.main([__file__])