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

const VolunteerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/2589/2589175.png', // Heart/First Aid icon
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

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

export const IncidentMap = ({
  userLocation,
  nearestHospital,
  ambulanceLocation,
  allIncidents,
  showHeatmap,
  volunteers,
  showVolunteers,
  className = ''
}) => {
  const defaultCenter = [9.0197, 38.7469]; // Addis Ababa
  const isValidCoord = (lat, lng) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
  const safeUserLocation =
    Array.isArray(userLocation) && isValidCoord(userLocation[0], userLocation[1])
      ? [Number(userLocation[0]), Number(userLocation[1])]
      : null;
  const safeAmbulanceLocation =
    Array.isArray(ambulanceLocation) && isValidCoord(ambulanceLocation[0], ambulanceLocation[1])
      ? [Number(ambulanceLocation[0]), Number(ambulanceLocation[1])]
      : null;
  const safeNearestHospital =
    nearestHospital && isValidCoord(nearestHospital.lat, nearestHospital.lng)
      ? { ...nearestHospital, lat: Number(nearestHospital.lat), lng: Number(nearestHospital.lng) }
      : null;
  const safeIncidents = (allIncidents || []).filter((inc) => isValidCoord(inc?.lat, inc?.lng));
  const safeVolunteers = (volunteers || []).filter((v) => isValidCoord(v?.lat, v?.lng));
  
  return (
    <div className={`relative z-0 w-full overflow-hidden ${className || 'h-[280px] sm:h-[360px] rounded-xl shadow-lg border-2 border-slate-200'}`}>
      <MapContainer
        center={safeUserLocation || defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Heatmap Simulation Layer */}
        {showHeatmap && safeIncidents.map(inc => (
          <Circle 
            key={`heat-${inc.id}`}
            center={[Number(inc.lat), Number(inc.lng)]}
            radius={200}
            pathOptions={{ 
              fillColor: inc.type === 'Fire' ? 'orange' : 'red', 
              color: 'transparent',
              fillOpacity: 0.4 
            }}
          />
        ))}
        
        {safeUserLocation && (
          <>
            <Marker position={safeUserLocation}>
              <Popup>Your Location</Popup>
            </Marker>
            <ChangeView center={safeUserLocation} />
          </>
        )}
        
        {safeNearestHospital && (
          <Marker 
            position={[safeNearestHospital.lat, safeNearestHospital.lng]}
          >
            <Popup>
              <div className="font-bold">{safeNearestHospital.name}</div>
              <div className="text-xs">Nearest Hospital</div>
            </Popup>
          </Marker>
        )}

        {safeAmbulanceLocation && (
          <Marker position={safeAmbulanceLocation} icon={AmbulanceIcon}>
            <Popup>
              <div className="font-bold text-red-600">Ambulance #QD-01</div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Live Tracking Active</div>
              <div className="text-xs font-bold mt-1">En Route</div>
            </Popup>
          </Marker>
        )}

        {showVolunteers && safeVolunteers.map(v => (
          <Marker 
            key={`vol-${v.id}`} 
            position={[Number(v.lat), Number(v.lng)]} 
            icon={VolunteerIcon}
          >
            <Popup>
              <div className="font-black text-blue-600 uppercase text-[10px] tracking-widest mb-1">Civilian Responder</div>
              <div className="font-bold">{v.name}</div>
              <div className="text-[9px] text-slate-500 uppercase font-black">Status: Available</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
