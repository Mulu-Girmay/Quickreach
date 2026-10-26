import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  MapPin,
  Bell,
  Shield,
  Navigation,
  Clock,
  AlertTriangle,
  Heart,
  Activity,
  Star,
  ChevronRight,
  Circle,
  RefreshCw,
  User,
  Wifi,
  WifiOff,
  Ambulance,
} from "lucide-react";
import { IncidentMap } from "../components/IncidentMap";
import { apiFetch } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { VolunteerSidebar } from "../components/VolunteerSidebar";
import { useLocation } from "react-router-dom";

const getIncidentLocationName = (lat, lng) => {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return "Unknown Location";

  const landmarks = [
    { name: "5 Kilo", lat: 9.0468, lng: 38.7617 },
    { name: "4 Kilo", lat: 9.0372, lng: 38.7615 },
    { name: "Piassa", lat: 9.0356, lng: 38.7512 },
    { name: "Arat Kilo", lat: 9.0406, lng: 38.7612 },
    { name: "Bole", lat: 8.9894, lng: 38.7884 },
    { name: "Meskel Square", lat: 9.0106, lng: 38.7612 },
    { name: "Mexico", lat: 9.0065, lng: 38.7582 },
    { name: "Sarbet", lat: 9.0097, lng: 38.7326 },
    { name: "Kolfe", lat: 9.031, lng: 38.705 },
    { name: "Akaki", lat: 8.875, lng: 38.783 },
    { name: "Arada", lat: 9.03, lng: 38.75 },
  ];

  let nearest = null;
  let minDist = Infinity;
  for (const lm of landmarks) {
    const dLat = ((lm.lat - nLat) * Math.PI) / 180;
    const dLng = ((lm.lng - nLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((nLat * Math.PI) / 180) *
        Math.cos((lm.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    if (d < minDist) {
      minDist = d;
      nearest = lm;
    }
  }

  if (nearest && minDist <= 5) {
    return `${nearest.name} (~${minDist.toFixed(1)} km)`;
  }
  return `GPS (${nLat.toFixed(3)}, ${nLng.toFixed(3)})`;
};

export const VolunteerMode = () => {
  const routeLocation = useLocation();
  const isDashboardRoute = routeLocation.pathname === "/volunteer";
  const isActiveRoute = routeLocation.pathname === "/active" || routeLocation.pathname === "/volunteer/active";
  const isAllIncidentsRoute = routeLocation.pathname === "/volunteer/incidents";
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [allAvailableIncidents, setAllAvailableIncidents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [responderProgress, setResponderProgress] = useState(0);
  const [acceptedIncidentIds, setAcceptedIncidentIds] = useState([]);
  const displayedIncidents = isActiveRoute
    ? nearbyIncidents.filter((inc) => acceptedIncidentIds.includes(inc.id || inc._id))
    : nearbyIncidents;
  const [stats, setStats] = useState({
    alerts: 0,
    accepted: 0,
    responseRate: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [approvalMessage, setApprovalMessage] = useState(null);
  const [locationToast, setLocationToast] = useState(null);
  const lastLocationSyncRef = useRef({ time: 0, lat: null, lng: null });
  const showLocationToast = (type, message) => {
    setLocationToast({ type, message });
    window.setTimeout(() => setLocationToast(null), 1000);
  };

  useEffect(() => {
    if (!selectedIncident) {
      setResponderProgress(0);
      return undefined;
    }
    setResponderProgress(0);
    const timer = window.setInterval(() => {
      setResponderProgress((value) => (value >= 100 ? 100 : value + 2));
    }, 500);
    return () => window.clearInterval(timer);
  }, [selectedIncident?.id, selectedIncident?._id]);

  useEffect(() => {
    const targetId = routeLocation.pathname.endsWith("/active")
      ? "active-incidents"
      : routeLocation.pathname.endsWith("/incidents")
        ? "all-incidents"
        : "volunteer-dashboard";
    requestAnimationFrame(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [routeLocation.pathname]);

  const handleToggleOnline = async () => {
    const nextValue = !isOnline;
    setApprovalMessage(null);
    try {
      await apiFetch("/api/volunteers/me/status", {
        method: "PATCH",
        body: {
          is_online: nextValue,
          ...(location ? { lat: location.lat, lng: location.lng } : {}),
        },
      });
      setIsOnline(nextValue);
      if (location) {
        lastLocationSyncRef.current = {
          time: Date.now(),
          lat: location.lat,
          lng: location.lng,
        };
      }
    } catch (error) {
      console.error("Volunteer status sync failed:", error.message);
      setIsOnline(false);
      setApprovalMessage(
        error.message || "Failed to update status. Check your approval state.",
      );
    }
  }; // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Morning";
    if (hour < 17) return "Afternoon";
    return "Evening";
  };

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

      setAllAvailableIncidents(allPending);
      const matched = location
        ? allPending.map((inc) => ({ ...inc, distance: calculateDistance(location.lat, location.lng, inc.lat, inc.lng) })).filter((inc) => inc.distance <= 10).sort((a, b) => a.distance - b.distance)
        : allPending;
      setNearbyIncidents(matched);
      setStats({ alerts: matched.length, accepted: acceptedIncidentIds.length, responseRate: matched.length > 0 ? 94 : 0 });
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

      fetchNearbyIncidents();
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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

    const syncStatus = async (extra = {}) => {
      try {
        await apiFetch("/api/volunteers/me/status", {
          method: "PATCH",
          body: { is_online: isOnline, ...extra },
        });
      } catch (error) {
        console.error("Volunteer status sync failed:", error.message);
        if (isOnline) {
          setIsOnline(false);
          setApprovalMessage(
            error.message || "Your volunteer account is pending approval.",
          );
        }
      }
    };

    syncStatus(location ? { lat: location.lat, lng: location.lng } : {});
    if (location) {
      lastLocationSyncRef.current = {
        time: Date.now(),
        lat: location.lat,
        lng: location.lng,
      };
    }
  }, [isOnline, profile]);

  useEffect(() => {
    if (!profile || !isOnline || !location) return;

    const now = Date.now();
    const last = lastLocationSyncRef.current;
    if (now - last.time < 15000) return;

    lastLocationSyncRef.current = {
      time: now,
      lat: location.lat,
      lng: location.lng,
    };

    apiFetch("/api/volunteers/me/status", {
      method: "PATCH",
      body: { is_online: isOnline, lat: location.lat, lng: location.lng },
    }).catch((error) => {
      console.error("Volunteer location sync failed:", error.message);
    });
  }, [location, isOnline, profile]);

  useEffect(() => {
    if (!isOnline) return;
    fetchNearbyIncidents();

    const socket = connectSocket();
    const refreshNearbyIncidents = () => fetchNearbyIncidents();

    socket.on("new-incident", refreshNearbyIncidents);
    socket.on("incident-updated", refreshNearbyIncidents);

    return () => {
      socket.off("new-incident", refreshNearbyIncidents);
      socket.off("incident-updated", refreshNearbyIncidents);
    };
  }, [isOnline]); // location intentionally excluded — socket setup doesn't depend on it

  // Separate effect: re-fetch nearby incidents when location changes (no socket churn)
  useEffect(() => {
    if (!isOnline || !location) return;
    fetchNearbyIncidents();
  }, [location]);

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#020617] text-white font-sans lg:flex-row">
      <VolunteerSidebar />
      <div id="volunteer-dashboard" className="relative min-w-0 flex-1 overflow-x-hidden p-4 pb-32 md:p-6">
      <div id="active-incidents" className="sr-only">My Active Incidents</div>
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header with Glassmorphism */}
      <motion.header
        id="volunteer-profile"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-5 mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">QuickReach</h1>
              <span className="text-xs text-[#94A3B8]">Volunteer</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-[#94A3B8]">Status</p>
              <span
                className={`text-xs font-semibold ${isOnline ? "text-[#10B981]" : "text-[#94A3B8]"}`}
              >
                {isOnline ? "● Available" : "Off Duty"}
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-[rgba(255,255,255,0.08)] flex items-center justify-center overflow-hidden">
              {profile?.avatar ? (
                <img
                  src={profile.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-[#94A3B8]" />
              )}
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="mt-4 pt-4 border-t border-[rgba(255,255,255,0.05)]">
          <p className="text-sm text-[#94A3B8]">👋 Good {getGreeting()},</p>
          <p className="text-xl font-bold">{profile?.name || "Volunteer"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#94A3B8]">Ready to Respond</span>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold ${isOnline ? "text-[#10B981]" : "text-[#94A3B8]"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${isOnline ? "bg-[#10B981] animate-pulse" : "bg-[#94A3B8]"}`}
              />
              {isOnline ? "Available" : "Offline"}
            </span>
          </div>
        </div>
        {approvalMessage && (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-300">
            {approvalMessage}
          </div>
        )}
      </motion.header>

      {/* Stats Row - dashboard only */}
      {isDashboardRoute && <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        {[
          {
            icon: AlertTriangle,
            label: "Alerts",
            value: stats.alerts,
            color: "text-red-500",
          },
          {
            icon: Heart,
            label: "Accepted",
            value: stats.accepted,
            color: "text-pink-500",
          },
          {
            icon: Star,
            label: "Response",
            value: `${stats.responseRate}%`,
            color: "text-yellow-500",
          },
        ].map((stat, index) => (
          <motion.div
            key={index}
            whileHover={{ scale: 1.02 }}
            className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 text-center"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-[#94A3B8]">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>}

      <main className="relative z-10">
        {!isOnline ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-24 h-24 backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-full flex items-center justify-center mb-6">
              <UserCheck className="w-10 h-10 text-[#94A3B8]" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to help?</h2>
            <p className="text-[#94A3B8] max-w-xs">
              Switch to Online mode to receive alerts for nearby emergencies
              requiring first aid.
            </p>
            {profile?.name && (
              <p className="text-xs text-[#94A3B8]/60 mt-4">
                Signed in as {profile.name}
              </p>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`space-y-6 ${isAllIncidentsRoute ? "hidden" : ""}`}
            >
              {/* Live Map */}
              {selectedIncident && (
                <motion.div
                  id="active-incident"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <MapPin className="text-red-500 w-5 h-5" />
                      Live Incident Map
                    </h2>
                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="text-sm text-[#94A3B8] hover:text-white transition-colors"
                    >
                      Close Map
                    </button>
                  </div>
                  <div className="h-[420px] rounded-3xl overflow-hidden border border-[rgba(255,255,255,0.08)] backdrop-blur-xl bg-[rgba(15,23,42,0.65)] relative shadow-2xl">
                    <IncidentMap
                      userLocation={location && [location.lat, location.lng]}
                      activeIncident={selectedIncident}
                      showHeatmap={false}
                      className="h-full rounded-3xl border-0 shadow-none"
                    />
                    <div className="absolute left-4 right-4 top-4 z-[500] rounded-xl border border-red-400/30 bg-slate-950/80 px-3 py-2 backdrop-blur-md">
                      <div className="flex items-center gap-2 text-xs font-bold text-white"><Ambulance className="h-4 w-4 animate-pulse text-red-400" />En route to emergency: citizen assistance in progress <span className="ml-auto text-red-300">{responderProgress}%</span></div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full bg-red-500 transition-all duration-500" style={{ width: `${responderProgress}%` }} /></div>
                    </div>
                    {/* Map overlay indicators */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                      <div className="flex items-center gap-2 text-xs bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span>📍 You</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span>🚨 Incident</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Nearby Requests Header */}
              <div id="active-incidents" className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold">
                  {isActiveRoute
                    ? `My Active Missions (${displayedIncidents.length})`
                    : `Nearby Emergency Alerts (${nearbyIncidents.length})`}
                </h2>
              </div>

              {/* Incident Cards */}
              {displayedIncidents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10 text-center"
                >
                  <p className="text-[#94A3B8]">
                    {isActiveRoute
                      ? "No active missions in progress. Go to Dashboard to accept alerts."
                      : location
                        ? "No active incidents in your area"
                        : "Waiting for GPS..."}
                  </p>
                </motion.div>
              ) : (
                displayedIncidents.map((incident, index) => {
                  const id = incident.id || incident._id;
                  const isAccepted = acceptedIncidentIds.includes(id);
                  return (
                    <motion.div
                      key={id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      className="relative group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent rounded-3xl blur-xl group-hover:blur-2xl transition-all" />
                      <div
                        className={`relative backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border rounded-3xl p-6 shadow-xl transition-all ${
                          isAccepted
                            ? "border-[#10B981]/30"
                            : "border-[rgba(255,255,255,0.08)] hover:border-red-500/30"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-400/10 px-3 py-1 rounded-full">
                                🚨 HIGH PRIORITY
                              </span>
                              <span className="text-[10px] text-[#94A3B8]">
                                {new Date(
                                  incident.created_at,
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold">
                              {incident.type}
                            </h3>
                            <p className="text-sm text-[#94A3B8] flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {incident.location ||
                                getIncidentLocationName(
                                  incident.lat,
                                  incident.lng,
                                )}
                              <span className="mx-1">•</span>
                              <Clock className="w-3 h-3" />
                              {incident.distance
                                ? `${incident.distance.toFixed(1)} km away`
                                : "Calculating..."}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-[#94A3B8]">Distance</p>
                            <p className="text-lg font-bold">
                              {incident.distance
                                ? `${incident.distance.toFixed(1)} km`
                                : "--"}
                            </p>
                          </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-[rgba(255,255,255,0.05)] my-2" />

                        {/* Accept Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAcceptIncident(incident)}
                          disabled={isAccepted}
                            className={`w-fit min-w-[150px] self-end px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            isAccepted
                              ? "bg-[#10B981]/20 text-[#10B981] cursor-default"
                              : "bg-gradient-to-r from-red-600 to-red-500 hover:shadow-lg hover:shadow-red-500/25 text-white"
                          }`}
                        >
                          {isAccepted ? (
                            <>
                              <Navigation className="w-4 h-4" />
                              Accepted • En Route
                            </>
                          ) : (
                            <>
                              <Activity className="w-4 h-4" />
                              🚑 Accept Mission
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        )}
        {isAllIncidentsRoute && <section id="all-incidents" className="mt-10 border-t border-white/10 pt-6">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-bold"><Bell className="h-5 w-5 text-red-400" />All Available Incidents ({allAvailableIncidents.length})</h2>
          {allAvailableIncidents.map((incident) => <button key={incident.id || incident._id} onClick={() => handleAcceptIncident(incident)} className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-left hover:border-red-500/50"><span><b className="block">{incident.type}</b><small className="text-slate-500">Available response request</small></span><span className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold">Accept</span></button>)}
        </section>}
      </main>
      {locationToast && <div className={`fixed right-4 top-4 z-[10000] rounded-xl border px-4 py-3 text-sm font-bold shadow-2xl ${locationToast.type === "success" ? "border-emerald-500/40 bg-emerald-900 text-emerald-100" : "border-red-500/40 bg-red-900 text-red-100"}`}>{locationToast.message}</div>}

      {/* Floating Emergency Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-24 right-4 sm:right-6 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl backdrop-blur-xl bg-[rgba(15,23,42,0.85)] border border-[rgba(255,255,255,0.15)] shadow-2xl flex items-center justify-center group hover:border-red-500/30 transition-all"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  showLocationToast("success", "Your current location was updated successfully.");
                },
                (err) => {
                  console.error("GPS Error:", err);
                  const message = err.code === 1 ? "Please allow location access in your browser." : "Could not retrieve your current location.";
                  showLocationToast("error", message);
                },
                { enableHighAccuracy: true },
              );
            } else {
              showLocationToast("error", "This browser does not support location services.");
            }
          }}
        >
          <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 text-[#94A3B8] group-hover:text-red-400 transition-colors" />
        </motion.button>
        <p className="text-[9px] sm:text-[10px] text-[#94A3B8] mt-1 text-center font-bold">
          GPS Sync
        </p>
      </motion.div>

      {/* Online Toggle - Large Floating Button */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-md"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleToggleOnline}
          className={`w-full py-4 rounded-2xl backdrop-blur-xl border shadow-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
            isOnline
              ? "bg-[#10B981]/20 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/30"
              : "bg-[rgba(15,23,42,0.8)] border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:border-white/20"
          }`}
        >
          {isOnline ? (
            <>
              <Circle className="w-5 h-5 fill-current animate-pulse" />
              AVAILABLE
              <span className="text-xs font-normal text-[#94A3B8]">
                Tap to Go Offline
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5" />
              OFF DUTY
              <span className="text-xs font-normal text-[#94A3B8]">
                Go Online
              </span>
            </>
          )}
        </motion.button>
      </motion.div>
      </div>
    </div>
  );
};
