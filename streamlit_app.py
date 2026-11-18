"""Standalone Streamlit entry point. No backend server or credentials required."""
import html
import json

import folium
import streamlit as st
from streamlit_folium import st_folium

from demo_routing import build_graph, optimize_stops, parse_points, sample_points, shortest_results

st.set_page_config(page_title='Cab Driver Agent | Route Optimization', page_icon='🚕', layout='wide')
st.title('Cab Driver Agent — Intelligent Route Optimization')
st.caption('PYTHON · GRAPH ALGORITHMS · MULTI-STOP OPTIMIZATION')
st.write('Explore shortest paths and delivery tours on a weighted graph. Compare real algorithm results and inspect the network behind every route.')
st.info('Local demonstration mode: synthetic connections between sample or custom coordinates, not a road navigation service. No API keys required.')

with st.sidebar:
    st.header('Route laboratory')
    algorithm = st.selectbox('Algorithm', ['Dijkstra', 'A*', 'Nearest Neighbor + 2-opt'], key='algorithm')
    source = st.radio('Location data', ['Sample Bangalore graph', 'Custom coordinates'], key='location_source')
    speed = st.slider('Assumed average speed (km/h)', 5, 100, 30)
    tiles = st.checkbox('Show OpenStreetMap basemap', value=True)
    st.caption('Basemap tiles need internet. Calculations and graph overlays work without external services.')

try:
    if source == 'Custom coordinates':
        raw = st.text_area('Coordinates: one latitude,longitude pair per line (2–30 locations)', '12.9716,77.5946\n12.9352,77.6245\n12.9279,77.6147\n12.9284,77.5852')
        points = parse_points(raw)
    else:
        points = sample_points()
    graph = build_graph(points)
    nodes = list(points)
    label = lambda n: f'Node {n} · {points[n][0]:.4f}, {points[n][1]:.4f}'
    with st.form('route_inputs'):
        left, right = st.columns(2)
        start = left.selectbox('Start / depot', nodes, format_func=label)
        if algorithm == 'Nearest Neighbor + 2-opt':
            stops = right.multiselect('Delivery stops (at least two)', [n for n in nodes if n != start], default=[n for n in nodes if n != start][:4], format_func=label)
            end = None
        else:
            end = right.selectbox('Destination', nodes, index=len(nodes) - 1, format_func=label)
            stops = []
        submitted = st.form_submit_button('Calculate route', type='primary')
    # Bind persisted results to all relevant inputs, so edits cannot show stale routes.
    signature = (algorithm, tuple(points.items()), start, end, tuple(stops))
    if submitted:
        st.session_state.pop('route_result', None)
        with st.spinner('Searching the graph and comparing routes…'):
            results = optimize_stops(graph, [start] + stops) if end is None else shortest_results(graph, points, start, end)
        st.session_state.route_result = (signature, results)
    saved = st.session_state.get('route_result')
    results = saved[1] if saved and saved[0] == signature else None
    selected = next((r for r in results if r['algorithm'] == algorithm), None) if results else None
    if selected:
        c1, c2, c3 = st.columns(3)
        c1.metric('Route distance', f"{selected['distance_km']:.2f} km")
        c2.metric('Estimated travel time', f"{selected['distance_km'] / speed * 60:.1f} min")
        c3.metric('Measured compute time', f"{selected['runtime_ms']:.3f} ms")
        st.caption(f'ETA = distance ÷ {speed} km/h; excludes traffic, stops, and road conditions. Runtime is one local measurement, not a benchmark.')
    route_tab, comparison_tab, engineering_tab = st.tabs(['Route map', 'Algorithm comparison', 'Engineering notes'])
    with route_tab:
        center = [sum(p[i] for p in points.values()) / len(points) for i in (0, 1)]
        map_view = folium.Map(location=center, tiles='OpenStreetMap' if tiles else None)
        for a, neighbors in graph.items():
            for b, weight in neighbors:
                if a < b:
                    folium.PolyLine([points[a], points[b]], color='#94a3b8', weight=2, opacity=.5, tooltip=f'{a} ↔ {b}: {weight:.2f} km').add_to(map_view)
        if selected:
            folium.PolyLine([points[n] for n in selected['path']], color='#2563eb', weight=6, tooltip=html.escape(selected['algorithm'])).add_to(map_view)
        for n, point in points.items():
            folium.Marker(point, tooltip=label(n), icon=folium.Icon(color='green' if n == start else 'blue')).add_to(map_view)
        map_view.fit_bounds(list(points.values()))
        st_folium(map_view, height=490, use_container_width=True, returned_objects=[])
        if selected:
            st.write('Graph path: ' + ' → '.join(map(str, selected['path'])))
            if 'tour' in selected:
                st.write('Stop order: ' + ' → '.join(map(str, selected['tour'])))
                st.caption('Closed tour returns to the depot. Shortest-path legs may pass through other stops before their scheduled visit.')
            st.download_button('Download calculation JSON', json.dumps(dict(points=points, speed_kmh=speed, results=results), indent=2), 'route_result.json', 'application/json')
        else:
            st.caption('Choose locations and calculate a route to highlight it on the network.')
    with comparison_tab:
        if results:
            st.dataframe([dict(Algorithm=r['algorithm'], **{'Distance (km)': r['distance_km'], 'ETA (min)': r['distance_km'] / speed * 60, 'Compute (ms)': r['runtime_ms']}) for r in results], hide_index=True, width='stretch')
            if end is None:
                st.write(f"2-opt distance saved: {results[0]['distance_km'] - results[1]['distance_km']:.3f} km")
                st.caption(f"Shared shortest-path matrix preprocessing: {results[0]['preprocessing_ms']:.3f} ms; excluded from compute column.")
            else:
                st.caption('Both algorithms should return the same optimal distance; tied shortest paths may differ.')
        else:
            st.write('Calculate a route to see measured comparisons.')
    with engineering_tab:
        st.markdown(r'''**Graph:** adjacency lists; undirected edges join three nearest neighbors plus an ID-order backbone for connectivity. Edge weights are Haversine kilometers. Sample coordinates come from `sample_graph.csv`.

**Dijkstra:** a min-heap expands the least known distance. Typical complexity O((V + E) log V).

**A\*:** prioritizes distance so far plus Haversine distance to the goal. The heuristic is consistent for this graph because each edge is weighted by great-circle distance.

**Nearest Neighbor + 2-opt:** Dijkstra supplies a shortest-path distance matrix between selected stops. A greedy closed tour is improved by segment reversals. This is a heuristic, with no global optimality guarantee. Nearest Neighbor takes O(k²); this implementation of 2-opt takes O(k³) per scan because it sums each candidate tour, and may need multiple scans.

**Architecture:** this demo imports pure backend algorithms directly. The original Next.js → FastAPI → Celery/Redis → Supabase system remains separate. No road routing, address geocoding, traffic, persistence, or background workers are used here.''')
        st.dataframe([dict(node=n, latitude=p[0], longitude=p[1], degree=len(graph[n])) for n, p in points.items()], hide_index=True)
except ValueError as exc:
    st.error(str(exc))
except OSError:
    st.error('Sample data could not be loaded. Check that sample_graph.csv is included in the deployment.')
