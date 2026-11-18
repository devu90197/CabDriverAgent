"""Correctness and UI regression checks for the standalone deployment."""
import math
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.routes.algorithms import astar, dijkstra
from demo_routing import build_graph, optimize_stops, parse_points, sample_points, shortest_results


def test_all_sample_pairs():
    points = sample_points()
    graph = build_graph(points)
    for a in points:
        for b in points:
            results = shortest_results(graph, points, a, b)
            assert results[0]['distance_km'] == pytest.approx(results[1]['distance_km'])
            for result in results:
                path = result['path']
                assert path[0] == a and path[-1] == b
                assert sum(dict(graph[x])[y] for x, y in zip(path, path[1:])) == pytest.approx(result['distance_km'])


def test_astar_priority_is_not_path_cost():
    points = {0: (0, 0), 1: (0, .01), 2: (0, .02), 3: (0, .03)}
    graph = {0: [(1, 2), (3, 20)], 1: [(2, 2)], 2: [(3, 2)], 3: []}
    assert astar(graph, points, 0, 3) == ([0, 1, 2, 3], 6)
    assert dijkstra({0: [], 1: []}, 0, 1) == ([], math.inf)
    assert astar({0: [], 1: []}, {0: (0, 0), 1: (0, 1)}, 0, 1) == ([], math.inf)


def test_multi_stop():
    points = sample_points()
    graph = build_graph(points)
    stops = list(points)
    initial, improved = optimize_stops(graph, stops)
    assert improved['distance_km'] <= initial['distance_km']
    for result in (initial, improved):
        assert result['tour'][0] == result['tour'][-1] == stops[0]
        assert sorted(result['tour'][:-1]) == stops
        path = result['path']
        assert sum(dict(graph[a])[b] for a, b in zip(path, path[1:])) == pytest.approx(result['distance_km'])
    with pytest.raises(ValueError):
        optimize_stops(graph, [1, 2])
    with pytest.raises(ValueError):
        optimize_stops({1: [], 2: [], 3: []}, [1, 2, 3])


@pytest.mark.parametrize('text', ['', '1,2', 'a,b\n1,2', '91,0\n0,0', '0,181\n0,0', 'nan,0\n0,0', 'inf,0\n0,0', '1,2,3\n4,5', '1,2\n1,2', '\n'.join('1,2' for _ in range(31))])
def test_invalid_coordinates(text):
    with pytest.raises(ValueError):
        parse_points(text)


def test_custom_graph():
    points = parse_points('0,0\n0,1\n1,1\n1,0')
    assert shortest_results(build_graph(points), points, 1, 3)[0]['distance_km'] > 0


def test_ui_without_services(monkeypatch):
    for key in list(os.environ):
        if any(word in key.upper() for word in ('SUPABASE', 'REDIS', 'CELERY', 'API_KEY')):
            monkeypatch.delenv(key)
    from streamlit.testing.v1 import AppTest
    app = AppTest.from_file(str(Path(__file__).resolve().parents[1] / 'streamlit_app.py')).run(timeout=30)
    assert not app.exception
    app.button[0].click().run()
    assert not app.exception and len(app.metric) == 3
    app.selectbox(key='algorithm').select('A*').run()
    app.button[0].click().run()
    assert not app.exception and len(app.metric) == 3
    app.selectbox(key='algorithm').select('Nearest Neighbor + 2-opt').run()
    app.button[0].click().run()
    assert not app.exception and len(app.metric) == 3
    app.multiselect[0].set_value([])
    app.button[0].click().run()
    assert not app.exception and app.error
    app.radio(key='location_source').set_value('Custom coordinates').run()
    app.text_area[0].set_value('bad input').run()
    assert not app.exception and app.error
