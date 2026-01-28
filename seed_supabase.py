"""
Script to seed Supabase database with sample graph data
"""

import csv
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def seed_nodes_and_edges():
    """Seed nodes and edges tables with sample data"""
    
    # Initialize Supabase client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables")
        return
    
    supabase: Client = create_client(url, key)
    
    # Read nodes from CSV
    nodes = []
    with open('sample_graph.csv', 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            nodes.append({
                'id': int(row['node_id']),
                'lat': float(row['lat']),
                'lng': float(row['lng'])
            })
    
    # Insert nodes
    try:
        response = supabase.table('nodes').insert(nodes).execute()
        print(f"Inserted {len(nodes)} nodes")
    except Exception as e:
        print(f"Error inserting nodes: {e}")
        return
    
    # Create sample edges (undirected graph - insert both directions)
    edges = []
    edge_id = 1
    
    # Connect nodes in a circular fashion with some additional connections
    connections = [
        (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), 
        (6, 7), (7, 8), (8, 9), (9, 10), (10, 1),
        (1, 7), (2, 8), (3, 9), (4, 10), (5, 1)
    ]
    
    for from_node, to_node in connections:
        # Calculate distance between nodes
        from_node_data = next(n for n in nodes if n['id'] == from_node)
        to_node_data = next(n for n in nodes if n['id'] == to_node)
        
        # Simple Euclidean distance approximation (in km)
        import math
        distance = math.sqrt(
            (from_node_data['lat'] - to_node_data['lat'])**2 + 
            (from_node_data['lng'] - to_node_data['lng'])**2
        ) * 111  # Rough conversion to km
        
        # Add both directions for undirected graph
        edges.append({
            'id': edge_id,
            'from_node': from_node,
            'to_node': to_node,
            'distance_km': round(distance, 2),
            'travel_time_min': round(distance * 2, 1)  # Assume 2 min/km
        })
        edge_id += 1
        
        edges.append({
            'id': edge_id,
            'from_node': to_node,
            'to_node': from_node,
            'distance_km': round(distance, 2),
            'travel_time_min': round(distance * 2, 1)
        })
        edge_id += 1
    
    # Insert edges
    try:
        # Insert in batches of 100 to avoid timeouts
        batch_size = 100
        for i in range(0, len(edges), batch_size):
            batch = edges[i:i+batch_size]
            response = supabase.table('edges').insert(batch).execute()
        print(f"Inserted {len(edges)} edges")
    except Exception as e:
        print(f"Error inserting edges: {e}")
        return
    
    print("Seeding completed successfully!")

if __name__ == "__main__":
    seed_nodes_and_edges()