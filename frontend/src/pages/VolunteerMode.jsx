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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background Blur */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-2xl shadow-red-600/30">
              <Shield className="w-8 h-8 text-white" />
            </div>

            <div>
              <p className="text-slate-400 text-sm">
                Volunteer Emergency System
              </p>

              <h1 className="text-4xl font-black tracking-tight">QuickReach</h1>

              <p className="text-slate-400 mt-1">
                Respond to nearby emergencies faster than ever.
              </p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-5 flex items-center gap-5 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xl font-bold">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : "V"}
            </div>

            <div>
              <p className="text-slate-400 text-sm">Welcome Back</p>

              <h2 className="font-bold text-lg">
                {profile?.name || "Volunteer"}
              </h2>

              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isOnline ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />

                <span
                  className={`text-sm font-semibold ${
                    isOnline ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {isOnline ? "Available" : "Offline"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-10">
          {/* Left */}

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              🚑 Emergency Response Mode
            </div>

            <h2 className="text-5xl font-black leading-tight">
              Every Second
              <br />
              Can Save
              <span className="text-red-500"> A Life.</span>
            </h2>

            <p className="mt-6 text-slate-400 leading-8 text-lg">
              Stay online to receive nearby emergency alerts, navigate directly
              to incidents, and provide immediate first aid assistance.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">
              <button
                onClick={() => setIsOnline(!isOnline)}
                className={`px-8 py-4 rounded-2xl font-bold transition-all duration-300 ${
                  isOnline
                    ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/40"
                    : "bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/40"
                }`}
              >
                {isOnline ? "Go Offline" : "Go Online"}
              </button>

              <button className="px-8 py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition">
                View History
              </button>
            </div>
          </div>

          {/* Right */}

          <div className="relative rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl p-8">
            <div className="absolute top-5 right-5">
              <div className="flex items-center gap-2 bg-black/30 backdrop-blur-lg px-4 py-2 rounded-full">
                <span
                  className={`w-3 h-3 rounded-full animate-pulse ${
                    isOnline ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />

                <span className="text-sm font-semibold">
                  {isOnline ? "Monitoring Live" : "Offline"}
                </span>
              </div>
            </div>

            <div className="h-full flex flex-col justify-center items-center text-center">
              <div className="w-36 h-36 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-8">
                <Shield className="w-16 h-16 text-red-500" />
              </div>

              <h3 className="text-3xl font-black mb-4">Ready to Respond</h3>

              <p className="text-slate-400 max-w-sm">
                Once you're online, QuickReach instantly matches you with nearby
                emergency requests.
              </p>
            </div>
          </div>
        </div>

        {/* ================= DASHBOARD CARDS ================= */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
          {/* Nearby Alerts */}

          <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-sm">Nearby Alerts</p>

                <h2 className="text-4xl font-black mt-2">
                  {nearbyIncidents.length}
                </h2>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
                <Bell className="w-8 h-8 text-red-500" />
              </div>
            </div>

            <div className="mt-6 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
                style={{
                  width: `${Math.min(nearbyIncidents.length * 20, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Volunteer Status */}

          <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between">
              <div>
                <p className="text-slate-400 text-sm">Volunteer Status</p>

                <h2
                  className={`text-3xl font-black mt-2 ${
                    isOnline ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {isOnline ? "AVAILABLE" : "OFFLINE"}
                </h2>
              </div>

              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  isOnline ? "bg-emerald-500/10" : "bg-slate-700/30"
                }`}
              >
                <UserCheck
                  className={`w-8 h-8 ${
                    isOnline ? "text-emerald-400" : "text-slate-500"
                  }`}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              />

              <span className="text-slate-400">
                {isOnline
                  ? "Receiving emergency requests"
                  : "Not receiving alerts"}
              </span>
            </div>
          </div>

          {/* Accepted Missions */}

          <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between">
              <div>
                <p className="text-slate-400 text-sm">Accepted Missions</p>

                <h2 className="text-4xl font-black mt-2 text-cyan-400">
                  {acceptedIncidentIds.length}
                </h2>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                🚑
              </div>
            </div>

            <p className="mt-6 text-slate-400 text-sm">
              Incidents currently assigned to you.
            </p>
          </div>

          {/* GPS */}

          <div className="group bg-white/5 backdrop-blur-xl border border-white/10 rounded-[28px] p-6 hover:bg-white/10 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between">
              <div>
                <p className="text-slate-400 text-sm">Current Location</p>

                <h2 className="text-lg font-bold mt-2">
                  {location ? "GPS Active" : "Searching..."}
                </h2>
              </div>

              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-blue-400" />
              </div>
            </div>

            <div className="mt-6 text-sm text-slate-400">
              {location ? (
                <>
                  <div>Lat: {location.lat.toFixed(5)}</div>
                  <div>Lng: {location.lng.toFixed(5)}</div>
                </>
              ) : (
                "Waiting for GPS permission..."
              )}
            </div>
          </div>
        </div>
        {/* ================= LIVE MISSION MAP ================= */}

        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-3xl font-black">Live Mission Map</h2>

              <p className="text-slate-400 mt-1">
                Your location and nearby emergencies in real time.
              </p>
            </div>

            {selectedIncident && (
              <span className="px-5 py-2 rounded-full bg-red-500/15 text-red-400 font-semibold border border-red-500/30">
                🚨 Active Mission
              </span>
            )}
          </div>

          <div className="relative rounded-[34px] overflow-hidden border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
            {/* Floating Status */}

            <div className="absolute top-6 left-6 z-20 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full ${
                    isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                  }`}
                />

                <div>
                  <p className="text-xs text-slate-400">Volunteer Status</p>

                  <h3 className="font-bold">
                    {isOnline ? "Monitoring Nearby Incidents" : "Offline"}
                  </h3>
                </div>
              </div>
            </div>

            {/* Floating GPS */}

            <div className="absolute top-6 right-6 z-20 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-4">
              <div className="flex items-center gap-3">
                <MapPin className="text-blue-400 w-5 h-5" />

                <div>
                  <p className="text-xs text-slate-400">GPS</p>

                  <h3 className="font-bold">
                    {location ? "Connected" : "Searching..."}
                  </h3>
                </div>
              </div>
            </div>

            {/* MAP */}

            <div className="h-[500px]">
              <IncidentMap
                userLocation={location ? [location.lat, location.lng] : null}
                activeIncident={selectedIncident}
                showHeatmap={false}
                className="h-full w-full"
              />
            </div>

            {/* Bottom Information */}

            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/95 to-transparent p-8">
              {!selectedIncident ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold">Waiting for Mission</h3>

                    <p className="text-slate-400 mt-2">
                      Accept an incident to begin navigation.
                    </p>
                  </div>

                  <button
                    onClick={fetchNearbyIncidents}
                    className="px-7 py-4 rounded-2xl bg-red-600 hover:bg-red-500 transition font-semibold shadow-lg shadow-red-600/30"
                  >
                    Refresh Incidents
                  </button>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-sm">
                        {selectedIncident.status}
                      </span>

                      <span className="text-slate-400">
                        {selectedIncident.distance?.toFixed(1)} km away
                      </span>
                    </div>

                    <h2 className="text-3xl font-black">
                      {selectedIncident.type}
                    </h2>

                    <p className="text-slate-400 mt-2">
                      Proceed carefully to the emergency location and provide
                      first aid until professional responders arrive.
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <button
                      className="px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/20 transition"
                      onClick={() => setSelectedIncident(null)}
                    >
                      Close
                    </button>

                    <button className="px-8 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 transition shadow-xl shadow-red-600/30">
                      Start Navigation →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
