import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
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

function ChangeView({ center }) {
  const map = useMap();
  map.setView(center, 14);
  return null;
}

export const IncidentMap = ({ userLocation, nearestHospital }) => {
  const defaultCenter = [9.0197, 38.7469]; // Addis Ababa
  
  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
      <MapContainer center={userLocation || defaultCenter} zoom={13} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
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
      </MapContainer>
    </div>
  );
};
