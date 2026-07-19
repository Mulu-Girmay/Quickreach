import React, { useState, useEffect } from "react";
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
} from "lucide-react";
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
  const [stats, setStats] = useState({
    alerts: 0,
    accepted: 0,
    responseRate: 0,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [approvalMessage, setApprovalMessage] = useState(null);
  const lastLocationSyncRef = useRef({ time: 0, lat: null, lng: null });

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
      setApprovalMessage(error.message);
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

      if (location) {
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
          .filter((inc) => inc.distance <= 10)
          .sort((a, b) => a.distance - b.distance);

        setNearbyIncidents(withDist);
        // Update stats
        setStats({
          alerts: withDist.length,
          accepted: acceptedIncidentIds.length,
          responseRate: withDist.length > 0 ? 94 : 0,
        });
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

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#020617] text-white font-sans p-4 md:p-6 pb-32 relative overflow-x-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* Header with Glassmorphism */}
      <motion.header
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
          {approvalMessage && (
            <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 text-sm text-amber-300">
              {approvalMessage}
            </div>
          )}

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
      </motion.header>

      {/* Stats Row */}
      <motion.div
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
      </motion.div>

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
              className="space-y-6"
            >
              {/* Live Map */}
              {selectedIncident && (
                <motion.div
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
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 text-red-400" />
                <h2 className="text-xl font-bold">
                  Nearby Requests ({nearbyIncidents.length})
                </h2>
              </div>

              {/* Incident Cards */}
              {nearbyIncidents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-10 text-center"
                >
                  <p className="text-[#94A3B8]">
                    {location
                      ? "No active incidents in your area"
                      : "Waiting for GPS..."}
                  </p>
                </motion.div>
              ) : (
                nearbyIncidents.map((incident, index) => {
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
                              {incident.location || "Unknown Location"}
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
                        <div className="border-t border-[rgba(255,255,255,0.05)] my-4" />

                        {/* Accept Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleAcceptIncident(incident)}
                          disabled={isAccepted}
                          className={`w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
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
      </main>

      {/* Floating Emergency Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-16 h-16 rounded-2xl backdrop-blur-xl bg-[rgba(15,23,42,0.8)] border border-[rgba(255,255,255,0.1)] shadow-2xl flex items-center justify-center group hover:border-red-500/30 transition-all"
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  }),
                (err) => console.error("GPS Error:", err),
                { enableHighAccuracy: true },
              );
            }
          }}
        >
          <RefreshCw className="w-6 h-6 text-[#94A3B8] group-hover:text-red-400 transition-colors" />
        </motion.button>
        <p className="text-[10px] text-[#94A3B8] mt-1 text-center">
          Update Location
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
          onClick={() => setIsOnline(!isOnline)}
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
  );
};
