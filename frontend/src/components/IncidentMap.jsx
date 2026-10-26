import React from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in React-Leaflet
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const VolunteerIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2589/2589175.png", // Heart/First Aid icon
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const AmbulanceIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3448/3448339.png",
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const EmergencyIncidentIcon = L.divIcon({
  className: "custom-incident-pin",
  html: `
    <div style="position:relative;width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(239,68,68,0.45);animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <span style="position:relative;width:24px;height:24px;border-radius:50%;background:#dc2626;border:2px solid #ffffff;box-shadow:0 0 14px rgba(220,38,38,0.9);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:900;">🚨</span>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const ChangeView = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center && Number.isFinite(center[0]) && Number.isFinite(center[1])) {
      map.setView(center);
    }
  }, [center, map]);
  return null;
};

export const IncidentMap = ({
  userLocation,
  activeIncident,
  nearestHospital,
  ambulanceLocation,
  allIncidents,
  showHeatmap,
  volunteers,
  showVolunteers,
  className = "",
}) => {
  const defaultCenter = [9.0197, 38.7469]; // Addis Ababa
  const hasIncidentCoords =
    activeIncident &&
    Number.isFinite(Number(activeIncident.lat)) &&
    Number.isFinite(Number(activeIncident.lng));
  const incidentCenter = hasIncidentCoords
    ? [Number(activeIncident.lat), Number(activeIncident.lng)]
    : null;

  return (
    <div
      className={`w-full overflow-hidden ${className || "h-[280px] sm:h-[360px] rounded-xl shadow-lg border-2 border-slate-200"}`}
    >
      <MapContainer
        center={userLocation || incidentCenter || defaultCenter}
        zoom={13}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Heatmap Simulation Layer */}
        {showHeatmap &&
          allIncidents &&
          allIncidents.map((inc, idx) => (
            <Circle
              key={`heat-${inc.id || inc._id || idx}`}
              center={[inc.lat, inc.lng]}
              radius={200}
              pathOptions={{
                fillColor: inc.type === "Fire" ? "#991b1b" : "#dc2626",
                color: "transparent",
                fillOpacity: 0.4,
              }}
            />
          ))}

        {hasIncidentCoords && (
          <>
            <Circle
              center={incidentCenter}
              radius={180}
              pathOptions={{
                color: "#dc2626",
                fillColor: "#ef4444",
                fillOpacity: 0.28,
                weight: 2,
              }}
            />
            <Marker position={incidentCenter} icon={EmergencyIncidentIcon}>
              <Popup>
                <div className="space-y-1 p-1 text-slate-900">
                  <div className="flex items-center gap-1.5 font-black text-red-600 text-xs uppercase tracking-wider">
                    <span>🚨</span>
                    <span>{activeIncident.type || "Emergency"} Case</span>
                  </div>
                  {activeIncident.reporter_phone && (
                    <p className="text-[11px] font-bold text-slate-700">
                      Reporter: {activeIncident.reporter_phone}
                    </p>
                  )}
                  {activeIncident.status && (
                    <p className="text-[10px] uppercase font-bold text-slate-500">
                      Status: <span className="text-red-600">{activeIncident.status}</span>
                    </p>
                  )}
                  {activeIncident.description && (
                    <p className="text-[10px] text-slate-600 italic">
                      "{activeIncident.description}"
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
            {!userLocation && <ChangeView center={incidentCenter} />}
          </>
        )}

        {userLocation && (
          <>
            <Marker position={userLocation}>
              <Popup>Your Location</Popup>
            </Marker>
            <ChangeView center={userLocation} />
          </>
        )}

        {nearestHospital &&
          typeof nearestHospital.lat === "number" &&
          typeof nearestHospital.lng === "number" && (
            <Marker position={[nearestHospital.lat, nearestHospital.lng]}>
              <Popup>
                <div className="font-bold">{nearestHospital.name}</div>
                <div className="text-xs">Nearest Hospital</div>
              </Popup>
            </Marker>
          )}

        {ambulanceLocation &&
          typeof ambulanceLocation[0] === "number" &&
          typeof ambulanceLocation[1] === "number" && (
            <Marker position={ambulanceLocation} icon={AmbulanceIcon}>
              <Popup>
                <div className="font-bold text-red-600">Ambulance #QD-01</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
                  Live Tracking Active
                </div>
                <div className="text-xs font-bold mt-1">En Route</div>
              </Popup>
            </Marker>
          )}

        {showVolunteers &&
          volunteers &&
          volunteers.map((v) => {
            const hasValidCoords =
              typeof v.lat === "number" && typeof v.lng === "number";
            if (!hasValidCoords) return null;
            return (
              <Marker
                key={`vol-${v.id || v._id}`}
                position={[v.lat, v.lng]}
                icon={VolunteerIcon}
              >
                <Popup>
                  <div className="font-black text-red-600 uppercase text-[10px] tracking-widest mb-1">
                    Civilian Responder
                  </div>
                  <div className="font-bold">{v.name}</div>
                  <div className="text-[9px] text-slate-500 uppercase font-black">
                    Status: Available
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>
    </div>
  );
};
