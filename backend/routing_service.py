"""Road service adapters and DSA orchestration, independent of storage."""
import math
import os
from datetime import datetime, timezone
from time import perf_counter

import httpx
from fastapi import HTTPException

try:
    from .routes.algorithms import haversine_distance, nearest_neighbor, two_opt
    from .routes.enhanced_algorithms import dijkstra_with_steps, astar_with_steps
except ImportError:  # uvicorn app:app from backend/
    from routes.algorithms import haversine_distance, nearest_neighbor, two_opt
    from routes.enhanced_algorithms import dijkstra_with_steps, astar_with_steps


async def provider_json(url, params):
    try:
        async with httpx.AsyncClient(timeout=18, follow_redirects=True) as client:
            response = await client.get(url, params=params, headers={
                'User-Agent': 'CabDriverAgent/2.0 (https://github.com/devu90197/CabDriverAgent)'})
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException as exc:
        raise HTTPException(504, 'Map provider timed out. Try again or select local DSA mode.') from exc
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(502, 'Map provider is unavailable. Try again later or enter coordinates.') from exc
    if not isinstance(data, dict):
        raise HTTPException(502, 'Map provider returned an invalid response.')
    return data


async def osrm(service, locations, **params):
    coords = ';'.join(f"{p['lng']},{p['lat']}" for p in locations)
    base = os.getenv('OSRM_BASE_URL', 'https://router.project-osrm.org').rstrip('/')
    data = await provider_json(f'{base}/{service}/v1/driving/{coords}', params)
    if data.get('code') != 'Ok':
        raise HTTPException(422, 'No driving route connects these locations. Move points closer to roads.')
    return data


def solve_legs(graph, coords, order, algorithm, detailed):
    begin = perf_counter()
    path, all_steps, explored, cost = [order[0]], [], 0, 0.0
    for a, b in zip(order, order[1:]):
        if algorithm == 'dijkstra':
            leg, weight, steps = dijkstra_with_steps(graph, a, b)
        else:
            leg, weight, steps = astar_with_steps(graph, coords, a, b)
        if not math.isfinite(weight):
            raise HTTPException(422, 'No connected route exists for all requested stops.')
        path.extend(leg[1:])
        cost += weight
        explored += len(steps[-1].visited_nodes) if steps else 0
        if detailed:
            for step in steps:
                item = step.to_dict()
                item['step_number'] = len(all_steps) + 1
                all_steps.append(item)
    return path, {'cost': cost, 'nodes_explored': explored, 'steps_count': explored,
                  'execution_time_ms': (perf_counter() - begin) * 1000}, all_steps


async def compute_route(request, report=None):
    """Mandatory stops; NN/2-opt may reorder them but preserve both endpoints.

    Live DSA operates on a directed waypoint graph of provider road costs.
    OSRM computes road paths; our DSA does not search its internal road graph.
    """
    started = perf_counter()
    locations = [p.model_dump() for p in [request.pickup, *request.stops, request.dropoff]]
    n = len(locations)
    if report:
        report(10)
    if request.routing_mode == 'road':
        table = await osrm('table', locations, annotations='distance,duration')
        distances, durations = table.get('distances'), table.get('durations')
        if any(not isinstance(m, list) or len(m) != n or any(not isinstance(row, list) or len(row) != n for row in m) for m in (distances, durations)):
            raise HTTPException(502, 'Road provider did not return a usable distance matrix.')
        if any(v is not None and (not isinstance(v, (int, float)) or not math.isfinite(v) or v < 0) for matrix in (distances, durations) for row in matrix for v in row):
            raise HTTPException(502, 'Road provider returned invalid matrix costs.')
        # Zero remains admissible with snapped coordinates and time weights.
        coords = {i: (0, 0) for i in range(n)}
        heuristic = 'zero (safe lower bound for snapped road costs)'
    else:
        distances = [[haversine_distance(a['lat'], a['lng'], b['lat'], b['lng']) * 1000 for b in locations] for a in locations]
        durations = [[d / 1000 / 30 * 3600 for d in row] for row in distances]
        coords = {i: (p['lat'], p['lng']) if request.optimize_for == 'distance' else (0, 0) for i, p in enumerate(locations)}
        heuristic = 'Haversine km' if request.optimize_for == 'distance' else 'zero (time objective)'
    costs = durations if request.optimize_for == 'time' else distances
    scale = 60 if request.optimize_for == 'time' else 1000
    graph = {i: [(j, v / scale) for j, v in enumerate(row) if i != j and isinstance(v, (int, float)) and math.isfinite(v) and v >= 0] for i, row in enumerate(costs)}
    if report:
        report(45)
    algorithm = request.algorithm
    if algorithm == 'auto':
        algorithm = 'nn+2opt' if request.stops else 'astar'
    order = list(range(n))
    stats, steps = {}, []
    if algorithm == 'nn+2opt':
        matrix = {(i, j): (costs[i][j] / scale if isinstance(costs[i][j], (int, float)) else math.inf) for i in range(n) for j in range(n) if i != j}
        initial, _ = nearest_neighbor(order[:-1], matrix)
        initial = (initial[:-1] if len(initial) > 1 else initial) + [n - 1]
        initial_cost = sum(matrix[a, b] for a, b in zip(initial, initial[1:]))
        order, optimized_cost = two_opt(initial, matrix)
        if not math.isfinite(optimized_cost):
            raise HTTPException(422, 'No route connects all selected stops.')
        path = order
        stats['optimization'] = {'initial_cost': initial_cost, 'optimized_cost': optimized_cost, 'cost_unit': 'min' if request.optimize_for == 'time' else 'km'}
    else:
        path, current_stats, steps = solve_legs(graph, coords, order, algorithm, request.detailed_steps)
        stats[f'{algorithm}_stats'] = current_stats
    if request.show_algorithm_comparison:
        for name in ('dijkstra', 'astar'):
            _, comparison, _ = solve_legs(graph, coords, order, name, False)
            stats[f'{name}_stats'] = comparison
    for name in ('dijkstra', 'astar'):
        if f'{name}_stats' in stats:
            stats[f'{name}_stats']['cost_unit'] = 'min' if request.optimize_for == 'time' else 'km'
    if report:
        report(70)
    if request.routing_mode == 'road':
        data = await osrm('route', [locations[i] for i in path], overview='full', geometries='geojson', steps='false')
        try:
            road = data['routes'][0]
            geometry = road['geometry']
            distance, eta = road['distance'] / 1000, road['duration'] / 60
            if geometry['type'] != 'LineString' or len(geometry['coordinates']) < 2 or not all(math.isfinite(v) and v >= 0 for v in (distance, eta)):
                raise ValueError
            for lng, lat in geometry['coordinates']:
                if not (math.isfinite(lat) and math.isfinite(lng) and -90 <= lat <= 90 and -180 <= lng <= 180):
                    raise ValueError
        except (KeyError, IndexError, TypeError, ValueError) as exc:
            raise HTTPException(502, 'Road provider returned an invalid route.') from exc
        source = 'OSRM road network'
        warning = 'Road ETA uses the provider driving profile, not live traffic. DSA searches the waypoint cost graph; OSRM supplies road geometry. A* uses a zero heuristic for safety.'
    else:
        geometry = {'type': 'LineString', 'coordinates': [[locations[i]['lng'], locations[i]['lat']] for i in path]}
        distance = sum(distances[a][b] for a, b in zip(path, path[1:])) / 1000
        eta = distance / 30 * 60
        source = 'Local great-circle demonstration'
        warning = 'Straight-line demonstration, not driving directions. ETA assumes 30 km/h; no traffic data.'
    return dict(route_geojson=geometry, distance_km=distance, eta_min=eta, algorithm=algorithm,
                routing_mode=request.routing_mode, source=source, warning=warning,
                optimize_for=request.optimize_for, heuristic=heuristic, complete_path=path,
                stop_order=order, locations=[dict(p, id=str(i), name='Pickup' if i == 0 else 'Dropoff' if i == n-1 else f'Stop {i}') for i, p in enumerate(locations)],
                steps=steps, execution_time_ms=(perf_counter() - started) * 1000,
                calculated_at=datetime.now(timezone.utc).isoformat(), **stats)
