# Cab Driver Agent - Intelligent Route Optimization

An interactive full-stack route optimizer with the original Next.js/Leaflet frontend, FastAPI road routing, live browser location, and algorithm exploration. A separate standalone Streamlit demonstration is also available.

Repository: https://github.com/devu90197/CabDriverAgent

## Original Next.js application — start here

The original interface supports real address search, interactive and draggable map markers, live device location with optional movement-based route refresh, road geometry and provider ETA, Dijkstra/A* comparisons, multi-stop Nearest Neighbor + 2-opt, and actual background-job progress. Hardcoded job successes, mock locations, fixed ETAs, and fabricated fleet metrics have been removed from this application path.

See **[NEXTJS_DEPLOYMENT.md](NEXTJS_DEPLOYMENT.md)** for local setup, environment variables, frontend/backend deployment settings, algorithm boundaries, and verification commands. Run FastAPI with `backend/requirements-api.txt` and the Next.js app from `frontend/`. Deploy the frontend on a Next.js-capable host and the API on a Python/Docker host. Streamlit Community Cloud hosts only the separate Python demo below.

Road ETA excludes live traffic. Default background jobs use a bounded, temporary in-process store and require one API process/replica. The retained legacy Celery/Supabase path is separate and is not invoked by this default API. Public map providers can be unavailable or rate limited; their failures are shown explicitly.

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

## Retained distributed architecture references

The original Celery worker, Redis/Supabase setup scripts, SQL, and optional client utilities remain in the repository. The repaired Next.js default uses the API documented in [NEXTJS_DEPLOYMENT.md](NEXTJS_DEPLOYMENT.md), with real provider routing and temporary in-process jobs. It does not invoke the legacy worker or automatically persist user routes.

Historical setup and architecture notes are preserved in [ORIGINAL_ARCHITECTURE.md](ORIGINAL_ARCHITECTURE.md) and [SUPABASE_SETUP.md](SUPABASE_SETUP.md). These describe the legacy integration path and are not a verification claim for that distributed deployment. Educational material remains in [ALGORITHM_EXPLANATION.md](ALGORITHM_EXPLANATION.md), [ALGORITHM_SUMMARY.md](ALGORITHM_SUMMARY.md), and the notebook. Never commit actual credentials or expose service-role keys to frontend code.
