# Cab Driver Agent - Intelligent Route Optimization

An interactive Python and DSA portfolio project for exploring shortest paths and multi-stop route optimization. The standalone Streamlit demonstration runs real algorithms from the existing backend without a server, database, or task queue.

Repository: https://github.com/devu90197/CabDriverAgent

## Standalone Streamlit demonstration

- Select Dijkstra, A*, or Nearest Neighbor + 2-opt in the sidebar.
- Use the ten Bangalore coordinates in `sample_graph.csv`, or enter 2-30 distinct latitude,longitude pairs.
- Select endpoints or a depot and delivery stops, then calculate a route.
- Explore the interactive Folium map, graph edges, route distance, speed-based ETA, measured runtimes, comparison table, and downloadable calculation JSON.
- Toggle the OpenStreetMap basemap off to view only the graph. Tiles require internet; route computation does not call external services.

### Local setup

Use Python **3.11** (the locally tested version). From the repository root:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS / Linux instead:
# source .venv/bin/activate
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
```

Runtime dependencies are Streamlit, Folium, and streamlit-folium, pinned in the root `requirements.txt`. Development checks additionally use pytest:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest tests backend/test_algorithms.py
python -m compileall -q streamlit_app.py demo_routing.py backend/routes tests
```

The integration test uses Streamlit AppTest to exercise all three algorithms and invalid inputs with service credentials removed. Routing tests compare all 100 sample endpoint pairs and check that each displayed path sums to its reported cost.

## Algorithms and design

`backend/routes/algorithms.py` supplies the existing pure Python implementations:

| Algorithm | Role | Properties |
| --- | --- | --- |
| Haversine | Edge distances in km | Great-circle geometry |
| Dijkstra | Point-to-point routing and stop distance matrix | Optimal for nonnegative weights; heap-based adjacency lists |
| A* | Point-to-point routing | Uses Haversine as a consistent lower bound on this demo graph |
| Nearest Neighbor | Initial closed multi-stop tour | Greedy O(k^2); no global optimality guarantee |
| 2-opt | Improve the initial tour | Segment reversal local search; O(k^3) per scan in this implementation, potentially multiple scans |

`demo_routing.py` validates inputs, loads sample coordinates, creates a connected synthetic network, computes comparisons, and expands tours into actual graph paths. `streamlit_app.py` handles presentation and session-local results. Changing inputs invalidates the displayed result.

The network joins each node to its three nearest neighbors and includes an ID-order backbone to guarantee connectivity. Edges are undirected and weighted by Haversine distance. A* correctly keeps queue priority separate from accumulated path distance. Unreachable paths return an empty path and infinite cost.

The enhanced backend module also contains step-tracked Dijkstra/A* and a multi-stop solver. `algorithm_demo.py` and `algorithm_examples.py` provide independent educational implementations; the app imports the backend version to avoid duplicating algorithms. `backend/utils/geocoding.py` is absent in this checkout; the standalone demo provides coordinate inputs rather than address lookup.

### Demonstration limitations

This is a synthetic geographic graph, **not a road network**. Straight graph segments may cross buildings or terrain. Distances are graph costs, not validated driving distances. ETA is distance / user-selected speed and excludes traffic, service time, and road conditions. Runtime is a single local measurement, not a performance claim. Two-opt may make no improvement and does not guarantee the globally shortest tour. Tours return to their depot; shortest-path legs can pass through other delivery nodes. Input is limited to 30 points for responsive shared hosting. No address geocoding, road routing API, user authentication, or persistence is used.

## Streamlit Community Cloud deployment

Open https://share.streamlit.io/deploy and authorize access to the GitHub repository if prompted.

| Setting | Value |
| --- | --- |
| Repository | `devu90197/CabDriverAgent` |
| Branch | `main` |
| Main file path | `streamlit_app.py` |
| Advanced settings / Python | `3.11` |
| Secrets | None required |

Deploy from the repository root so Cloud finds `requirements.txt` and `sample_graph.csv`. Python selection and dependency handling follow the [Community Cloud deployment documentation](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy) and [dependency documentation](https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/app-dependencies). Local tests do not establish that a public deployment exists; verify the resulting live URL after deployment.

## Original distributed full-stack application

The original architecture is preserved separately:

```text
Next.js / TypeScript / Leaflet -> FastAPI -> Supabase
                                  |
                             Celery / Redis
                                  |
                         optional n8n webhook

Streamlit -> demo_routing -> pure backend algorithms + sample_graph.csv
```

The full-stack application uses `frontend/` for its Next.js UI, `backend/app.py` for HTTP endpoints, and `worker/tasks.py` for asynchronous jobs. Supabase SQL and setup scripts remain in the repository. These services are **not** started or imported by the Streamlit application.

Install full-stack dependencies independently:

```bash
python -m pip install -r backend/requirements.txt
python -m pip install -r worker/requirements.txt
# The worker also imports supabase, provided by backend/requirements.txt above.
cd frontend
npm install
```

Configure private environment variables using `.env.example` and [SUPABASE_SETUP.md](SUPABASE_SETUP.md). The backend needs `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; the frontend uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Configure worker broker/result URLs with `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`. Optional n8n configuration uses environment variables. Never put service-role credentials in frontend variables or commit `.env` files. The Streamlit demo has no optional service integrations to configure; any future integration must read private Streamlit secrets or environment variables.

Run services in separate terminals, using the configured environment:

```bash
cd backend
uvicorn app:app --reload
```

```bash
cd worker
celery -A tasks worker --loglevel=info
```

```bash
cd frontend
npm run dev
```

The original distributed stack has separate service requirements and is not validated by the standalone demo tests. Historical architecture notes are retained in [ORIGINAL_ARCHITECTURE.md](ORIGINAL_ARCHITECTURE.md); statements there about scalability, automation, and performance are design context, not verified benchmark claims. Additional educational material remains in [ALGORITHM_EXPLANATION.md](ALGORITHM_EXPLANATION.md), [ALGORITHM_SUMMARY.md](ALGORITHM_SUMMARY.md), and the existing notebook.
