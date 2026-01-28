import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { decode } from '@mapbox/polyline';

// Define types
interface Location {
  lat: number;
  lng: number;
}

interface RoutePath {
  type: string;
  coordinates: [number, number][]; // [lng, lat] format
}

interface MapComponentProps {
  pickup: Location;
  dropoff: Location;
  stops: Location[];
  routePath?: RoutePath | null;
  onPickupChange: (location: Location) => void;
  onDropoffChange: (location: Location) => void;
  onStopsChange: (stops: Location[]) => void;
  activeField: 'pickup' | 'dropoff' | 'stop' | null;
  onStopSelect?: (index: number) => void;
}

export default function MapComponent({
  pickup,
  dropoff,
  stops,
  routePath,
  onPickupChange,
  onDropoffChange,
  onStopsChange,
  activeField,
  onStopSelect
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);
  const [zoom] = useState(13);
  const mapRef = useRef<any>(null);
  const [MapContainer, setMapContainer] = useState<any>(null);
  const [TileLayer, setTileLayer] = useState<any>(null);
  const [Marker, setMarker] = useState<any>(null);
  const [Popup, setPopup] = useState<any>(null);
  const [Polyline, setPolyline] = useState<any>(null);
  const [L, setL] = useState<any>(null);

  // Dynamically import leaflet components only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      Promise.all([
        import('leaflet'),
        import('react-leaflet')
      ]).then(([leaflet, reactLeaflet]) => {
        setL(() => leaflet.default);
        setMapContainer(() => reactLeaflet.MapContainer);
        setTileLayer(() => reactLeaflet.TileLayer);
        setMarker(() => reactLeaflet.Marker);
        setPopup(() => reactLeaflet.Popup);
        setPolyline(() => reactLeaflet.Polyline);
      });
    }
  }, []);

  // Create icons only after L is available
  const [icons, setIcons] = useState<{
    pickupIcon: any;
    dropoffIcon: any;
    stopIcon: any;
  } | null>(null);

  useEffect(() => {
    if (L) {
      const pickupIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const dropoffIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      // Yellow icon for intermediate stops
      const stopIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-yellow.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      setIcons({
        pickupIcon,
        dropoffIcon,
        stopIcon
      });
    }
  }, [L]);

  // Update map center when locations change
  useEffect(() => {
    if (pickup.lat !== 0 || pickup.lng !== 0) {
      setMapCenter([pickup.lat, pickup.lng]);
    } else if (dropoff.lat !== 0 || dropoff.lng !== 0) {
      setMapCenter([dropoff.lat, dropoff.lng]);
    }
  }, [pickup, dropoff]);

  // Handle map click
  const handleMapClick = (e: any) => {
    if (!e || !e.latlng) return;
    
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;
    
    if (activeField === 'pickup') {
      onPickupChange({ lat, lng });
    } else if (activeField === 'dropoff') {
      onDropoffChange({ lat, lng });
    }
  };

  // Attach map event handler after map is created
  const handleMapCreate = (mapInstance: any) => {
    mapRef.current = mapInstance;
    if (mapInstance) {
      mapInstance.on('click', handleMapClick);
    }
  };

  if (typeof window === 'undefined' || !MapContainer || !TileLayer || !L || !icons) {
    return (
      <div className="w-full h-96 rounded-xl overflow-hidden border border-gray-700 card-glass flex items-center justify-center">
        <p className="text-gray-400">Loading map...</p>
      </div>
    );
  }

  const { pickupIcon, dropoffIcon, stopIcon } = icons;

  // Create separate polyline segments for user-input locations
  const pickupToStopsPoints: [number, number][] = [];
  const stopsToDropoffPoints: [number, number][] = [];

  // Add pickup point to the first segment
  if (pickup.lat !== 0 || pickup.lng !== 0) {
    pickupToStopsPoints.push([pickup.lat, pickup.lng]);
  }

  // Add all stops to both segments
  stops.forEach(stop => {
    if (stop.lat !== 0 || stop.lng !== 0) {
      pickupToStopsPoints.push([stop.lat, stop.lng]);
      stopsToDropoffPoints.push([stop.lat, stop.lng]);
    }
  });

  // Add dropoff point to the second segment
  if (dropoff.lat !== 0 || dropoff.lng !== 0) {
    stopsToDropoffPoints.push([dropoff.lat, dropoff.lng]);
  }

  // Process route path if provided
  let routeCoordinates: [number, number][] = [];
  if (routePath && routePath.coordinates && routePath.coordinates.length > 0) {
    routeCoordinates = routePath.coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng,lat] to [lat,lng] for Leaflet
  }

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden border border-gray-700 card-glass">
      <MapContainer 
        center={mapCenter} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        ref={handleMapCreate}
        whenCreated={handleMapCreate}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Pickup Marker */}
        {(pickup.lat !== 0 || pickup.lng !== 0) && Marker && Popup && pickupIcon && (
          <Marker position={[pickup.lat, pickup.lng]} icon={pickupIcon}>
            <Popup>
              <div className="font-bold text-green-600">Pickup Location</div>
              <div>Lat: {pickup.lat.toFixed(6)}</div>
              <div>Lng: {pickup.lng.toFixed(6)}</div>
            </Popup>
          </Marker>
        )}
        
        {/* Dropoff Marker */}
        {(dropoff.lat !== 0 || dropoff.lng !== 0) && Marker && Popup && dropoffIcon && (
          <Marker position={[dropoff.lat, dropoff.lng]} icon={dropoffIcon}>
            <Popup>
              <div className="font-bold text-red-600">Dropoff Location</div>
              <div>Lat: {dropoff.lat.toFixed(6)}</div>
              <div>Lng: {dropoff.lng.toFixed(6)}</div>
            </Popup>
          </Marker>
        )}
        
        {/* Stop Markers */}
        {stops.map((stop, index) => (
          (stop.lat !== 0 || stop.lng !== 0) && Marker && Popup && stopIcon && (
            <Marker 
              key={index} 
              position={[stop.lat, stop.lng]} 
              icon={stopIcon}
              eventHandlers={{
                click: () => onStopSelect && onStopSelect(index),
              }}
            >
              <Popup>
                <div className="font-bold text-yellow-600">Stop {index + 1}</div>
                <div>Lat: {stop.lat.toFixed(6)}</div>
                <div>Lng: {stop.lng.toFixed(6)}</div>
              </Popup>
            </Marker>
          )
        ))}
        
        {/* Route Lines - Show road network path if available, otherwise show straight lines */}
        {routeCoordinates.length > 1 && Polyline ? (
          // Show road network path
          <Polyline 
            positions={routeCoordinates} 
            pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.7 }} 
          />
        ) : (
          // Fallback to straight lines when no road network path is available
          <>
            {/* Yellow line from pickup to stops (only if there are stops) */}
            {stops.length > 0 && pickupToStopsPoints.length > 1 && Polyline && (
              <Polyline 
                positions={pickupToStopsPoints} 
                pathOptions={{ color: "#fbbf24", weight: 4, opacity: 0.7 }} 
              />
            )}
            
            {/* Blue line from stops to dropoff (or direct line if no stops) */}
            {stops.length > 0 ? (
              stopsToDropoffPoints.length > 1 && Polyline && (
                <Polyline 
                  positions={stopsToDropoffPoints} 
                  pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.7 }} 
                />
              )
            ) : (
              // Direct line from pickup to dropoff when no stops
              ((pickup.lat !== 0 || pickup.lng !== 0) && (dropoff.lat !== 0 || dropoff.lng !== 0)) && Polyline && (
                <Polyline 
                  positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} 
                  pathOptions={{ color: "#3b82f6", weight: 4, opacity: 0.7 }} 
                />
              )
            )}
          </>
        )}
      </MapContainer>
    </div>
  );
}