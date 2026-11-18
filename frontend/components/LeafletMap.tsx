import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapProps, validLocation } from '../lib/routeTypes';

const icon = (color: string, text: string) => L.divIcon({
  className: '', html: `<div style="background:${color};color:#fff;border:2px solid white;border-radius:50%;width:28px;height:28px;display:grid;place-items:center;font-weight:bold;box-shadow:0 2px 8px #0008">${text}</div>`, iconSize: [28, 28], iconAnchor: [14, 14],
});
const pickupIcon = icon('#15803d', 'P'), dropoffIcon = icon('#dc2626', 'D');

function MapEvents(props: MapProps) {
  const map = useMap();
  const { pickup, dropoff, stops, routePath } = props;
  useEffect(() => {
    const points = routePath?.coordinates?.length ? routePath.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]) : [pickup, ...stops, dropoff].filter(validLocation).map(p => [p.lat, p.lng] as [number, number]);
    if (points.length) map.fitBounds(points, { padding: [35, 35], maxZoom: 16, animate: false });
  }, [map, pickup, dropoff, stops, routePath]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useMapEvents({ click: event => {
    if (props.readOnly) return;
    const point = { lat: event.latlng.lat, lng: event.latlng.lng };
    if (props.activeField === 'pickup') props.onPickupChange(point);
    if (props.activeField === 'dropoff') props.onDropoffChange(point);
    if (props.activeField === 'stop' && props.selectedStop !== undefined) props.onStopsChange(stops.map((p, i) => i === props.selectedStop ? point : p));
  } });
  return null;
}

export default function LeafletMap(props: MapProps) {
  const { pickup, dropoff, stops, routePath, livePosition } = props;
  return <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-700 relative z-0" data-testid="route-map">
    <MapContainer center={[12.9716, 77.5946]} zoom={13} style={{ height: '100%', width: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <MapEvents {...props} />
      {validLocation(pickup) && <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon} draggable={!props.readOnly} eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); props.onPickupChange({ lat: p.lat, lng: p.lng }); } }}><Popup>Pickup · drag to move</Popup></Marker>}
      {validLocation(dropoff) && <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon} draggable={!props.readOnly} eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); props.onDropoffChange({ lat: p.lat, lng: p.lng }); } }}><Popup>Dropoff · drag to move</Popup></Marker>}
      {stops.map((point, i) => validLocation(point) && <Marker key={i} position={[point.lat, point.lng]} icon={icon('#d97706', String(i + 1))} draggable={!props.readOnly} eventHandlers={{ dragend: e => { const p = e.target.getLatLng(); props.onStopsChange(stops.map((old, j) => i === j ? { lat: p.lat, lng: p.lng } : old)); } }}><Popup>Stop {i + 1} · drag to move</Popup></Marker>)}
      {routePath && <Polyline positions={routePath.coordinates.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: '#f59e0b', weight: 6 }} />}
      {livePosition && validLocation(livePosition) && <>
        <CircleMarker center={[livePosition.lat, livePosition.lng]} radius={8} pathOptions={{ color: '#fff', fillColor: '#2563eb', fillOpacity: 1 }}><Popup>Latest device position</Popup></CircleMarker>
        <Circle center={[livePosition.lat, livePosition.lng]} radius={props.accuracy || 10} pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: .1 }} />
      </>}
    </MapContainer>
  </div>;
}
