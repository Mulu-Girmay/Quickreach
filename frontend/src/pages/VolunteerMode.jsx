import React, { useState, useEffect } from "react";
import { UserCheck, MapPin, Bell, Shield } from "lucide-react";
import { IncidentMap } from "../components/IncidentMap";
import { apiFetch } from "../lib/api";
import { connectSocket } from "../lib/socket";
export const VolunteerMode = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [acceptedIncidentIds, setAcceptedIncidentIds] = useState([]);

  const loadProfile = async () => {
    try {
      const payload = await apiFetch("/api/volunteers/me");
      setProfile(payload.volunteer || null);
      if (payload.volunteer) setIsOnline(!!payload.volunteer.is_online);
    } catch (error) {
      console.error("Volunteer profile load failed:", error.message);
    }
  };

  const fetchNearbyIncidents = async () => {
    try {
      const payload = await apiFetch("/api/incidents");
      const allPending = (payload.incidents || []).filter(
        (i) => i.status === "Pending",
      );

      if (location) {
        // Calculate distances and filter
        const withDist = allPending
          .map((inc) => {
            const d = calculateDistance(
              location.lat,
              location.lng,
              inc.lat,
              inc.lng,
            );
            return { ...inc, distance: d };
          })
          .filter((inc) => inc.distance <= 10) // 10km radius
          .sort((a, b) => a.distance - b.distance);

        setNearbyIncidents(withDist);
      } else {
        setNearbyIncidents(allPending);
      }
    } catch (error) {
      console.error("Fetch incidents failed:", error.message);
    }
  };

  const handleAcceptIncident = async (incident) => {
    const id = incident.id || incident._id;
    if (!id) {
      alert("Invalid incident id");
      return;
    }
    try {
      await apiFetch(`/api/incidents/${id}/volunteer-accept`, {
        method: "POST",
      });
      setAcceptedIncidentIds((prev) =>
        prev.includes(id) ? prev : [...prev, id],
      );
      setSelectedIncident({ ...incident, id });
    } catch (error) {
      console.error("Volunteer accept failed:", error.message);
      alert(error.message || "Could not accept incident.");
    }
  };

  // Haversine Formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    loadProfile();
    // Watch Location
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) =>
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true },
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    const syncStatus = async () => {
      try {
        await apiFetch("/api/volunteers/me/status", {
          method: "PATCH",
          body: { is_online: isOnline },
        });
      } catch (error) {
        console.error("Volunteer status sync failed:", error.message);
      }
    };
    syncStatus();
  }, [isOnline, profile]);

  useEffect(() => {
    if (!isOnline) return;
    fetchNearbyIncidents();

    const socket = connectSocket();
    const refreshNearbyIncidents = () => {
      fetchNearbyIncidents();
    };

    socket.on("new-incident", refreshNearbyIncidents);
    socket.on("incident-updated", refreshNearbyIncidents);

    return () => {
      socket.off("new-incident", refreshNearbyIncidents);
      socket.off("incident-updated", refreshNearbyIncidents);
    };
  }, [isOnline, location]);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 pb-20">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold tracking-tight">
            QuickReach{" "}
            <span className="text-blue-500 font-medium text-lg">Volunteer</span>
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 p-1.5 rounded-full border border-white/5">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${isOnline ? "bg-green-500/20 text-green-400" : "bg-slate-700 text-slate-400"}`}
          >
            {isOnline ? "ONLINE" : "OFFLINE"}
          </span>
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`w-12 h-6 rounded-full relative transition-colors ${isOnline ? "bg-blue-600" : "bg-slate-600"}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isOnline ? "right-1" : "left-1"}`}
            />
          </button>
        </div>
      </header>

      <main>
        {!isOnline ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <UserCheck className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to help?</h2>
            <p className="text-slate-400 max-w-xs">
              Switch to Online mode to receive alerts for nearby emergencies
              requiring first aid.
            </p>
            {profile?.name && (
              <p className="text-xs text-slate-500 mt-4">
                Signed in as {profile.name}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Map View if Incident Selected */}
            {selectedIncident && (
              <div className="mb-6 animate-in slide-in-from-top">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <MapPin className="text-red-500" />
                    Responding to Incident
                  </h2>
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    Close Map
                  </button>
                </div>
                <div className="h-64 rounded-3xl overflow-hidden border border-slate-700 bg-slate-800 relative shadow-2xl">
                  <IncidentMap
                    userLocation={location && [location.lat, location.lng]}
                    activeIncident={selectedIncident}
                    showHeatmap={false}
                    className="h-full rounded-3xl border-0 shadow-none"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold">
                Nearby Alerts ({nearbyIncidents.length})
              </h2>
            </div>

            {nearbyIncidents.length === 0 ? (
              <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-10 text-center">
                <p className="text-slate-500">
                  Scanning for incidents in your radius...
                </p>
                {!location && (
                  <p className="text-xs text-orange-400 mt-2">
                    Waiting for GPS...
                  </p>
                )}
              </div>
            ) : (
              nearbyIncidents.map((incident) => {
                const id = incident.id || incident._id;
                return (
                  <div
                    key={id}
                    className="bg-slate-800 border border-blue-500/30 rounded-3xl p-6 shadow-xl animate-pulse"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-1 rounded mb-2 inline-block">
                          {incident.status}
                        </span>
                        <h3 className="text-xl font-bold">
                          {incident.type} Intervention
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(incident.created_at).toLocaleTimeString()}
                        </p>
                        {acceptedIncidentIds.includes(incident.id) && (
                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mt-2">
                            Accepted - En Route
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 text-sm font-bold">
                        <MapPin className="w-4 h-4 text-red-500" />
                        {incident.distance
                          ? `${incident.distance.toFixed(1)} km`
                          : "Calculating..."}
                      </div>
                    </div>
                    <p className="text-slate-300 mb-6 text-sm">
                      Emergency reported. First Responder assistance requested
                      for immediate aid.
                    </p>
                    <button
                      onClick={() => handleAcceptIncident(incident)}
                      className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-emerald-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors"
                      disabled={acceptedIncidentIds.includes(incident.id)}
                    >
                      {acceptedIncidentIds.includes(incident.id)
                        ? "Accepted • View Location"
                        : "Accept & View Location"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
};
