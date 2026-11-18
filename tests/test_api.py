"""API contract checks; upstream fixtures test failures without inventing live successes."""
import asyncio
import importlib
import threading
import time

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

api_module = importlib.import_module('backend.app')
service = importlib.import_module('backend.routing_service')


@pytest.fixture
def client():
    api_module.jobs.clear()
    api_module.geocode_cache.clear()
    with TestClient(api_module.app) as test_client:
        yield test_client


def request_body(**kwargs):
    return dict(pickup={'lat': 12.9716, 'lng': 77.5946}, dropoff={'lat': 12.9352, 'lng': 77.6245}, routing_mode='demo', **kwargs)


@pytest.mark.parametrize('algorithm', ['auto', 'dijkstra', 'astar', 'nn+2opt'])
def test_demo_algorithms(client, algorithm):
    response = client.post('/api/v1/routes/estimate', json=request_body(algorithm=algorithm, detailed_steps=True, show_algorithm_comparison=True))
    assert response.status_code == 200
    data = response.json()
    assert data['distance_km'] > 0 and data['eta_min'] == pytest.approx(data['distance_km'] * 2)
    assert data['complete_path'][0] == 0 and data['complete_path'][-1] == 1
    assert data['dijkstra_stats']['cost'] == pytest.approx(data['astar_stats']['cost'])


def test_fixed_endpoints_multi_stop(client):
    stops = [{'lat': 12.98, 'lng': 77.60}, {'lat': 12.95, 'lng': 77.62}, {'lat': 12.96, 'lng': 77.61}]
    data = client.post('/api/v1/routes/estimate', json=request_body(algorithm='nn+2opt', stops=stops)).json()
    assert data['stop_order'][0] == 0 and data['stop_order'][-1] == 4
    assert sorted(data['stop_order']) == list(range(5))
    assert data['optimization']['optimized_cost'] <= data['optimization']['initial_cost']


@pytest.mark.parametrize('change', [dict(pickup={'lat': 91, 'lng': 0}), dict(pickup={'lat': 'NaN', 'lng': 0}), dict(pickup={'lat': 0, 'lng': 'Infinity'}), dict(algorithm='fake'), dict(optimize_for='fare'), dict(routing_mode='fake'), dict(stops=[{'lat': 0, 'lng': 0}] * 11), dict(dropoff={'lat': 12.9716, 'lng': 77.5946})])
def test_validation(client, change):
    body = request_body(); body.update(change)
    assert client.post('/api/v1/routes/estimate', json=body).status_code == 422


def test_nonstandard_nonfinite_json_is_clean_validation_error(client):
    response = client.post('/api/v1/routes/estimate', content='{"pickup":{"lat":NaN,"lng":0},"dropoff":{"lat":1,"lng":1}}', headers={'Content-Type': 'application/json'})
    assert response.status_code == 422
    assert response.json()['detail'][0]['loc'][-1] == 'lat'


def test_live_metrics_geometry_and_time_objective(client, monkeypatch):
    calls = []
    async def upstream(kind, locations, **params):
        calls.append((kind, locations, params))
        if kind == 'table':
            return dict(distances=[[0, 9000], [10000, 0]], durations=[[0, 600], [700, 0]])
        return dict(routes=[dict(distance=9123, duration=654, geometry=dict(type='LineString', coordinates=[[77.5946, 12.9716], [77.60, 12.95], [77.6245, 12.9352]]))])
    monkeypatch.setattr(service, 'osrm', upstream)
    body = request_body(optimize_for='time', algorithm='astar', show_algorithm_comparison=True)
    body['routing_mode'] = 'road'
    response = client.post('/api/v1/routes/estimate', json=body)
    assert response.status_code == 200
    data = response.json()
    assert data['distance_km'] == 9.123 and data['eta_min'] == 10.9
    assert len(data['route_geojson']['coordinates']) == 3
    assert data['astar_stats']['cost'] == 10
    assert data['astar_stats']['cost_unit'] == 'min'
    assert [c[0] for c in calls] == ['table', 'route']


def test_provider_failure_does_not_become_demo(client, monkeypatch):
    async def failure(*args, **kwargs):
        raise HTTPException(504, 'Provider timeout')
    monkeypatch.setattr(service, 'osrm', failure)
    body = request_body(); body['routing_mode'] = 'road'
    response = client.post('/api/v1/routes/estimate', json=body)
    assert response.status_code == 504 and 'route_geojson' not in response.json()


def test_disconnected_road_graph(client, monkeypatch):
    async def disconnected(*args, **kwargs):
        return dict(distances=[[0, None], [None, 0]], durations=[[0, None], [None, 0]])
    monkeypatch.setattr(service, 'osrm', disconnected)
    body = request_body(); body['routing_mode'] = 'road'
    assert client.post('/api/v1/routes/estimate', json=body).status_code == 422


def test_real_job_lifecycle(client, monkeypatch):
    release = threading.Event()
    actual = api_module.compute_route
    async def slow(request, report):
        report(10)
        while not release.is_set():
            await asyncio.sleep(.01)
        return await actual(request, report)
    monkeypatch.setattr(api_module, 'compute_route', slow)
    queued = client.post('/api/v1/routes/estimate', json=request_body(async_mode=True)).json()
    job_id = queued['job_id']
    try:
        status = client.get(f'/api/v1/jobs/{job_id}').json()
        assert status['status'] == 'running' and status['progress'] == 10
        assert client.get(f'/api/v1/jobs/{job_id}/result').status_code == 409
    finally:
        release.set()
    for _ in range(100):
        if client.get(f'/api/v1/jobs/{job_id}').json()['status'] == 'completed': break
        time.sleep(.01)
    result = client.get(f'/api/v1/jobs/{job_id}/result')
    assert result.status_code == 200 and result.json()['result']['distance_km'] > 0
    assert client.get('/api/v1/jobs/missing').status_code == 404


def test_failed_job(client, monkeypatch):
    async def fail(*args, **kwargs): raise HTTPException(502, 'Road service unavailable')
    monkeypatch.setattr(api_module, 'compute_route', fail)
    job = client.post('/api/v1/routes/estimate', json=request_body(async_mode=True)).json()['job_id']
    for _ in range(100):
        status = client.get(f'/api/v1/jobs/{job}').json()
        if status['status'] == 'failed': break
        time.sleep(.01)
    assert status['status'] == 'failed' and status['error'] == 'Road service unavailable'
    assert client.get(f'/api/v1/jobs/{job}/result').status_code == 409


def test_geocode_cache_and_real_results(client, monkeypatch):
    calls = []
    async def upstream(url, params):
        calls.append(params)
        return {'features': [{'geometry': {'coordinates': [77.59, 12.97]}, 'properties': {'name': 'Bengaluru', 'country': 'India'}}]}
    monkeypatch.setattr(api_module, 'provider_json', upstream)
    for _ in range(2):
        response = client.get('/api/v1/geocode', params={'query': 'Bengaluru'})
        assert response.status_code == 200
        assert response.json()['results'][0]['lat'] == 12.97
    assert len(calls) == 1
    assert client.get('/api/v1/geocode', params={'query': 'ab'}).status_code == 422


def test_geocode_error_not_mock_place(client, monkeypatch):
    async def unavailable(*args, **kwargs): raise HTTPException(502, 'Address provider unavailable')
    monkeypatch.setattr(api_module, 'provider_json', unavailable)
    response = client.get('/api/v1/geocode', params={'query': 'Bengaluru'})
    assert response.status_code == 502 and 'results' not in response.json()


@pytest.mark.parametrize('behavior,expected', [('timeout', 504), ('error', 502), ('invalid', 502)])
def test_http_adapter_failures(monkeypatch, behavior, expected):
    original = httpx.AsyncClient
    def handler(request):
        if behavior == 'timeout': raise httpx.ReadTimeout('Timeout', request=request)
        if behavior == 'error': return httpx.Response(503)
        return httpx.Response(200, text='not JSON')
    monkeypatch.setattr(service.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(service.provider_json('https://example.com', {}))
    assert exc.value.status_code == expected
