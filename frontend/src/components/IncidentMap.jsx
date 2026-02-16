import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const AmbulanceIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048329.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const ChangeView = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center) map.setView(center);
  }, [center, map]);
  return null;
};

export const IncidentMap = ({ userLocation, nearestHospital, ambulanceLocation, allIncidents, showHeatmap }) => {
  const defaultCenter = [9.0197, 38.7469]; // Addis Ababa
  
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
      <MapContainer center={userLocation || defaultCenter} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Heatmap Simulation Layer */}
        {showHeatmap && allIncidents && allIncidents.map(inc => (
          <Circle 
            key={`heat-${inc.id}`}
            center={[inc.lat, inc.lng]}
            radius={200}
            pathOptions={{ 
              fillColor: inc.type === 'Fire' ? 'orange' : 'red', 
              color: 'transparent',
              fillOpacity: 0.4 
            }}
          />
        ))}
        
        {userLocation && (
          <>
            <Marker position={userLocation}>
              <Popup>Your Location</Popup>
            </Marker>
            <ChangeView center={userLocation} />
          </>
        )}
        
        {nearestHospital && (
          <Marker 
            position={[nearestHospital.lat, nearestHospital.lng]}
          >
            <Popup>
              <div className="font-bold">{nearestHospital.name}</div>
              <div className="text-xs">Nearest Hospital</div>
            </Popup>
          </Marker>
        )}

        {ambulanceLocation && (
          <Marker position={ambulanceLocation} icon={AmbulanceIcon}>
            <Popup>
              <div className="font-bold text-red-600">Ambulance #QD-01</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live Tracking Active</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};
