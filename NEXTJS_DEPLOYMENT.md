# Original Next.js app: live routing and deployment

The original dark Next.js/Leaflet interface is the primary full-stack application. It now uses actual address searches, OSRM road geometry and driving estimates, browser GPS updates, and genuine background-job state. The separate Streamlit app remains an optional DSA demonstration.

## Run locally

Use Python 3.11 and Node.js 22. From the repository root:

```bash
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux: source .venv/bin/activate
python -m pip install -r backend/requirements-api.txt
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Open http://localhost:3000. The Next.js server proxies `/api/v1/*` to FastAPI, defaulting to `http://127.0.0.1:8000`. No Supabase credentials or Redis instance are required for this path. Set `BACKEND_BASE_URL` in `frontend/.env.local` for another API host. It must be the origin, without `/api/v1`.

## What is live

- **Address search:** click Search or press Enter to query a configurable Photon server. Search results are real provider results. Searches are cached and requests serialized with at least 1.1 seconds between upstream calls in this single-process setup. Typing alone does not issue queries.
- **Map:** click an explicit pickup/dropoff/stop selector and then the map, or drag the corresponding marker. The calculated route line uses the actual response geometry. Leaflet CSS is bundled locally rather than loaded from a CDN.
- **GPS:** use the live-location button and grant browser permission. The blue position marker and accuracy circle update with device fixes. The first fix sets pickup; subsequent fixes update the live marker. Set pickup to the latest position manually, or opt into automatic route refresh: after a successful calculation, it checks every 30 seconds and recalculates after movement of at least 50 m. Turning tracking off or leaving the page clears the watcher. GPS requires HTTPS or localhost.
- **Road calculation:** OSRM Table supplies directed waypoint costs; the selected DSA algorithm runs on that graph. OSRM Route supplies the final road line, distance and duration for the resulting waypoint sequence. The provider driving profile determines individual road legs. Optimizing road-distance cost does **not** request a globally shortest-distance road profile; the public OSRM driving profile generally represents fastest-route legs.
- **Progress:** background requests use real asynchronous FastAPI tasks. UI polling reports queued/running/completed/failed stages and retrieves the actual job result. Jobs never return a hardcoded success. Completion renders results rather than leaving the progress panel spinning. Requests are aborted on input changes or navigation and bounded by client timeouts.
- **Errors:** invalid coordinates, duplicate locations, disconnected routes, missing jobs, provider failures and GPS permission errors are shown explicitly. Road failures never silently turn into a demo result.

**There is no live traffic feed, fare service, fleet telemetry, or verified fuel-saving metric.** Road ETA comes from the provider driving profile, not current congestion. Simulated GPS in automated tests verifies browser behavior, not physical device accuracy.

## Algorithm boundaries

The existing backend implementations are reused. Dijkstra and A* keep mandatory stops in input order. Auto selects A* without intermediate stops and Nearest Neighbor + 2-opt with stops. Optimization reorders intermediate stops while holding pickup and dropoff fixed; this is an open route, not the Streamlit demo's closed depot tour. The existing full-tour cost evaluation in 2-opt supports asymmetric road matrices.

Road mode DSA searches the **waypoint cost graph**, not the provider's private road graph. A* uses a zero lower bound for snapped road/time costs to preserve correctness, so live A* behaves like Dijkstra. Detailed steps and node-expansion counts come from actual algorithm execution. Comparison times exclude network requests; total calculation time includes them. No percentage efficiency score is fabricated.

Local DSA mode is explicitly selected in the UI. Its complete geographic graph uses Haversine distances, draws straight lines, and estimates time at 30 km/h. A* uses Haversine for the distance objective and zero for the time objective. This mode makes no routing-provider calls.

## Deploy the Next.js frontend

Use a Node-capable host, such as Vercel:

| Setting | Value |
| --- | --- |
| Repository | `devu90197/CabDriverAgent` |
| Branch | `main` |
| Root directory | `frontend` |
| Framework | Next.js |
| Node.js | 22.x |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Environment variable | `BACKEND_BASE_URL=https://your-api-host` |

Do not set this variable to localhost in a public deployment. Use an HTTPS backend URL and redeploy after changing host settings. The proxy forwards only allowed routing/geocoding/job/health requests and does not forward browser cookies or authorization headers to the upstream. Hosting request-duration limits must accommodate up to 45 seconds; background mode keeps the initial route request short.

See [Vercel project configuration](https://vercel.com/docs/project-configuration) for provider settings. Streamlit Community Cloud cannot host this Next.js application.

## Deploy FastAPI

`backend/Dockerfile` is built from the **repository root**:

```bash
docker build -f backend/Dockerfile -t cab-driver-api .
docker run --rm -p 8000:8000 -e PORT=8000 cab-driver-api
```

For a Docker web service, such as Render, use Dockerfile path `backend/Dockerfile`, Docker build context `.`, health path `/health`, and the host-provided `PORT`. Alternatively, use a Python service with build command `pip install -r backend/requirements-api.txt` and start command `python -m backend.app`. Root directory is the repository root in both cases. Set Python to 3.11 if the host supports selecting a runtime.

Server configuration examples are in `backend/.env.example`:

| Variable | Purpose |
| --- | --- |
| `PORT` | Listening port; default 8000 |
| `FASTAPI_HOST` | Listening address; default `0.0.0.0` |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins for direct CORS access |
| `OSRM_BASE_URL` | OSRM-compatible host; default public OSRM demo |
| `GEOCODING_URL` | Photon `/api/` endpoint; default public Photon demo |

See [Render Docker deployment](https://render.com/docs/docker) for hosting configuration.

### Job storage and production boundaries

The default API deliberately uses **one process and one replica**. Jobs are held in process memory for up to one hour, with at most 100 retained jobs and four concurrent background calculations. Restarting the API loses jobs. Do not use multiple Uvicorn workers or horizontal replicas with this job store; requests may otherwise reach another process and return 404. For production scaling, integrate a shared durable job store/queue first.

The original `worker/tasks.py`, Supabase SQL/scripts and optional frontend utilities remain as legacy distributed-stack components. The repaired default API does not dispatch to that worker or automatically save user routes. Its legacy queue/database path is not validated by the new end-to-end tests. Optional Supabase utilities tolerate absent public credentials. Before enabling persistence, configure authenticated ownership and RLS; the route planner does not assume that an arbitrary `user_id` provides authentication.

Public OSRM/Photon services have availability and usage limits, not a production SLA. For larger traffic use managed or self-hosted equivalents configured through environment variables. Photon explicitly permits reasonable demo use but throttles extensive use: [Photon documentation and usage guidance](https://github.com/komoot/photon). Road-service semantics: [OSRM HTTP API](https://project-osrm.org/docs/v5.24.0/api/). Map attribution remains visible. No public Nominatim autocomplete is used.

## Verification

```bash
python -m pip install -r requirements-dev.txt
python -m pytest
python -m compileall -q backend tests
cd frontend
npm run typecheck
npm run build
npx playwright install chromium --only-shell
# Keep FastAPI and Next.js running in separate terminals:
npm run test:e2e
```

If the system drive is low on space, set `PLAYWRIGHT_BROWSERS_PATH` and `TEMP`/`TMP` to a writable drive before installing and running Playwright. Test artifacts are ignored by Git. Browser tests include live providers and can fail when those providers are unavailable; backend fixture tests separately verify deterministic failure handling.

GitHub push does not establish a public deployment. Verify the frontend URL, API health, address search, road route, background mode, and device permission flow after deployment.

### Local verification boundaries

Verified locally on 18 November 2026 with Python 3.11.6 and Node.js 22.16.0: 48 Python tests passed; seven Playwright browser tests passed against the production Next.js server and running FastAPI API; TypeScript, Python compilation, dependency consistency, and production build checks passed. Live OSRM road routing, a live multi-stop background job, and Photon address search returned successful responses. Browser GPS tests use simulated positions and permission states.

The frontend uses Next.js 16.4.6 with the existing React 18 / React-Leaflet 4 integration. React 18 is supported by this release but carries a deprecation notice for a future Next.js major version. The runtime-only dependency audit reports no known vulnerabilities; the retained Tailwind 3 build-tool dependency tree still has glob-related audit advisories and should be evaluated separately before accepting untrusted build configuration. No build patterns are taken from route input.

Docker configuration is supplied, but the container build was not executed locally because Docker is not installed in this workspace environment. Physical-device GPS accuracy and a public deployment require verification on the target device/host. The retained legacy Supabase/Celery deployment is outside the verified default route path.
