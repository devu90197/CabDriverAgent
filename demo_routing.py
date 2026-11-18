"""Service-free graph construction and adapters for the existing backend algorithms."""
import csv
import math
from pathlib import Path
from time import perf_counter

from backend.routes.algorithms import astar, dijkstra, haversine_distance, nearest_neighbor, two_opt


def validate_points(points):
    if not 2 <= len(points) <= 30:
        raise ValueError('Provide between 2 and 30 unique locations.')
    for lat, lon in points.values():
        if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
            raise ValueError('Coordinates must be finite: latitude -90..90, longitude -180..180.')
    if len(set(points.values())) != len(points):
        raise ValueError('Locations must have distinct coordinates.')


def sample_points():
    with Path(__file__).with_name('sample_graph.csv').open(newline='') as file:
        return {int(r['node_id']): (float(r['lat']), float(r['lng'])) for r in csv.DictReader(file)}


def parse_points(text):
    """Accept one latitude,longitude pair per line; reject malformed or oversized input."""
    rows = text.strip().splitlines()
    if not 2 <= len(rows) <= 30:
        raise ValueError('Enter 2–30 lines, each containing latitude,longitude.')
    try:
        points = {i: tuple(map(float, row.split(','))) for i, row in enumerate(rows, 1)}
        if any(len(point) != 2 for point in points.values()):
            raise ValueError
    except ValueError as exc:
        raise ValueError('Each line must contain exactly two numbers: latitude,longitude.') from exc
    validate_points(points)
    return points


def build_graph(points):
    """Synthetic undirected network: connect three nearest neighbors plus an ID-order backbone.

    Edge cost is great-circle km, so Haversine is a consistent A* heuristic.
    The backbone guarantees connectivity; these edges are not real roads.
    """
    validate_points(points)
    nodes = list(points)
    edges = {tuple(sorted((a, b))) for a, b in zip(nodes, nodes[1:])}
    distance = lambda a, b: haversine_distance(*points[a], *points[b])
    for a in nodes:
        for b in sorted((b for b in nodes if b != a), key=lambda b: (distance(a, b), b))[:3]:
            edges.add(tuple(sorted((a, b))))
    graph = {a: [] for a in nodes}
    for a, b in sorted(edges):
        weight = distance(a, b)
        graph[a].append((b, weight))
        graph[b].append((a, weight))
    return graph


def shortest_results(graph, points, start, end):
    if start not in graph or end not in graph:
        raise ValueError('Select locations in the current graph.')
    results = []
    for name, solve, args in [('Dijkstra', dijkstra, (graph, start, end)), ('A*', astar, (graph, points, start, end))]:
        begin = perf_counter()
        path, distance = solve(*args)
        elapsed = (perf_counter() - begin) * 1000
        if not path or not math.isfinite(distance):
            raise ValueError('No connected route exists between these locations.')
        results.append(dict(algorithm=name, path=path, distance_km=distance, runtime_ms=elapsed))
    return results


def optimize_stops(graph, stops):
    if len(stops) < 3 or len(set(stops)) != len(stops) or any(n not in graph for n in stops):
        raise ValueError('Select at least three distinct stops from the graph.')
    begin = perf_counter()
    legs = {(a, b): dijkstra(graph, a, b) for a in stops for b in stops if a != b}
    if any(not math.isfinite(d) for _, d in legs.values()):
        raise ValueError('All stops must be connected.')
    matrix = {pair: distance for pair, (_, distance) in legs.items()}
    preprocessing = (perf_counter() - begin) * 1000
    results = []
    begin = perf_counter()
    initial, distance = nearest_neighbor(stops, matrix)
    nn_time = (perf_counter() - begin) * 1000
    begin = perf_counter()
    improved, improved_distance = two_opt(initial, matrix)
    opt_time = (perf_counter() - begin) * 1000
    for name, tour, cost, runtime in [('Nearest Neighbor', initial, distance, nn_time), ('Nearest Neighbor + 2-opt', improved, improved_distance, nn_time + opt_time)]:
        path = [tour[0]]
        for a, b in zip(tour, tour[1:]):
            path.extend(legs[a, b][0][1:])
        results.append(dict(algorithm=name, path=path, tour=tour, distance_km=cost, runtime_ms=runtime, preprocessing_ms=preprocessing))
    return results
