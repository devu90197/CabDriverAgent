"""FastAPI for the original Next.js UI: genuine routing, geocoding and job state."""
import asyncio
import os
import time
import uuid
from contextlib import asynccontextmanager
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, model_validator

try:
    from .routing_service import compute_route, provider_json
except ImportError:
    from routing_service import compute_route, provider_json

load_dotenv()
jobs, tasks, geocode_cache = {}, set(), {}
geocode_lock = asyncio.Lock()
last_geocode = 0.0
job_slots = asyncio.Semaphore(4)


@asynccontextmanager
async def lifespan(app):
    yield
    pending = list(tasks)
    for task in pending:
        task.cancel()
    await asyncio.gather(*pending, return_exceptions=True)


app = FastAPI(title='Cab Driver Agent API', version='2.0.0', lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(','), allow_credentials=False, allow_methods=['GET', 'POST'], allow_headers=['Content-Type'])


@app.exception_handler(RequestValidationError)
async def invalid_request(request, exc):
    # Exclude raw inputs and exception objects, including non-JSON NaN/Infinity.
    return JSONResponse(status_code=422, content={'detail': [
        {key: item[key] for key in ('loc', 'msg', 'type')} for item in exc.errors()
    ]})


class Location(BaseModel):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class RouteEstimateRequest(BaseModel):
    user_id: str | None = None  # Compatibility only, not authentication.
    pickup: Location
    dropoff: Location
    stops: list[Location] = Field(default_factory=list, max_length=10)
    optimize_for: Literal['distance', 'time'] = 'distance'
    algorithm: Literal['auto', 'dijkstra', 'astar', 'nn+2opt'] = 'auto'
    routing_mode: Literal['road', 'demo'] = 'road'
    async_mode: bool = False
    detailed_steps: bool = False
    show_algorithm_comparison: bool = False

    @model_validator(mode='after')
    def distinct_locations(self):
        points = [(p.lat, p.lng) for p in [self.pickup, *self.stops, self.dropoff]]
        if len(set(points)) != len(points):
            raise ValueError('Pickup, dropoff and stops must have distinct coordinates.')
        return self


def prune_jobs():
    for key, job in list(jobs.items()):
        if job['status'] in ('completed', 'failed') and time.monotonic() - job['created'] > 3600:
            del jobs[key]


async def run_job(job_id, request):
    job = jobs[job_id]
    try:
        async with job_slots:
            job.update(status='running', progress=5)
            result = await compute_route(request, lambda progress: job.update(progress=progress))
            job.update(result=result, status='completed', progress=100)
    except HTTPException as exc:
        job.update(status='failed', error=exc.detail)
    except Exception:
        job.update(status='failed', error='Route computation failed. Please retry.')


@app.post('/api/v1/routes/estimate')
async def estimate_route(request: RouteEstimateRequest):
    if not request.async_mode:
        return await compute_route(request)
    prune_jobs()
    if len(jobs) >= 100:
        raise HTTPException(503, 'Job capacity reached. Retry later or use synchronous mode.')
    job_id = uuid.uuid4().hex
    jobs[job_id] = dict(status='queued', progress=0, result=None, error=None, created=time.monotonic())
    task = asyncio.create_task(run_job(job_id, request))
    tasks.add(task)
    task.add_done_callback(tasks.discard)
    return dict(job_id=job_id, status='queued')


def lookup_job(job_id):
    prune_jobs()
    if job_id not in jobs:
        raise HTTPException(404, 'Job not found or expired. Calculate the route again.')
    return jobs[job_id]


@app.get('/api/v1/jobs/{job_id}')
async def get_job_status(job_id: str):
    job = lookup_job(job_id)
    return dict(job_id=job_id, status=job['status'], progress=job['progress'], error=job['error'])


@app.get('/api/v1/jobs/{job_id}/result')
async def get_job_result(job_id: str):
    job = lookup_job(job_id)
    if job['status'] != 'completed':
        raise HTTPException(409, job['error'] or 'Route is still processing.')
    return dict(job_id=job_id, result=job['result'])


@app.get('/api/v1/geocode')
async def geocode_location(query: str = Query(min_length=3, max_length=200)):
    """Explicit cached Photon search; no fabricated results on provider failure."""
    global last_geocode
    query = query.strip()
    if len(query) < 3:
        raise HTTPException(422, 'Enter at least three characters.')
    async with geocode_lock:
        cached = geocode_cache.get(query.casefold())
        if cached and time.monotonic() - cached[0] < 86400:
            return cached[1]
        delay = 1.1 - (time.monotonic() - last_geocode)
        if delay > 0:
            await asyncio.sleep(delay)
        last_geocode = time.monotonic()
        data = await provider_json(os.getenv('GEOCODING_URL', 'https://photon.komoot.io/api/'), {'q': query, 'limit': 5})
        try:
            results = []
            for feature in data['features']:
                p = feature['properties']
                lon, lat = feature['geometry']['coordinates'][:2]
                point = Location(lat=lat, lng=lon)
                name = ', '.join(dict.fromkeys(str(p[k]) for k in ('name', 'street', 'city', 'state', 'country') if p.get(k)))
                results.append(dict(display_name=name, lat=point.lat, lon=point.lng, type=p.get('osm_value', 'place')))
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(502, 'Address provider returned an invalid response.') from exc
        result = dict(results=results, source='Photon / OpenStreetMap')
        if len(geocode_cache) >= 500:
            geocode_cache.pop(next(iter(geocode_cache)))
        geocode_cache[query.casefold()] = (time.monotonic(), result)
        return result


@app.get('/health')
@app.get('/api/v1/health')
async def health_check():
    return dict(status='healthy', job_storage='process-memory', traffic_data=False)


if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host=os.getenv('FASTAPI_HOST', '0.0.0.0'), port=int(os.getenv('PORT', os.getenv('FASTAPI_PORT', '8000'))))
