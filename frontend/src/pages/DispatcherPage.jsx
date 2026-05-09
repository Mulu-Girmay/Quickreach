import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../components/NotificationSystem";
import { IncidentMap } from "../components/IncidentMap";
import {
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  CheckCircle,
  Play,
  Bell,
  MessageCircle,
  Video,
  Languages,
  Volume2,
  VolumeX,
} from "lucide-react";
import { EmergencyChat } from "../components/EmergencyChat";
import { IVRSimulator } from "../components/IVRSimulator";
import { VideoSOSModal } from "../components/VideoSOSModal";
import { cn } from "../lib/utils";
import { apiFetch } from "../lib/api";

const ALERT_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3"; // Urgent Emergency Alarm
const DISPATCH_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3"; // Professional Dispatch "Chirp"

export const DispatcherPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const [isIVROpen, setIsIVROpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const [hasUnitArrived, setHasUnitArrived] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const { addNotification } = useNotifications();
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [hasUnacknowledgedSOS, setHasUnacknowledgedSOS] = useState(false);
  const audioRef = useRef(null);
  const dispatchAudioRef = useRef(null);
  const pendingAlertRef = useRef(false); // queued sound when muted
  const lastIncidentIdRef = useRef(null);
  const getIncidentId = (incident) => incident?.id || incident?._id || null;
  const selectedIncidentId = getIncidentId(selectedIncident);
  const videoRoomName = selectedIncidentId
    ? `quickreach-incident-${selectedIncidentId}`
    : "";

  const getDialablePhone = (value) => {
    const raw = String(value || "").trim();
    if (!raw || raw.toUpperCase().startsWith("USSD")) return null;

    const compact = raw.replace(/[\s\-()]/g, "");
    const plusCount = (compact.match(/\+/g) || []).length;
    if (plusCount > 1 || (compact.includes("+") && !compact.startsWith("+"))) {
      return null;
    }

    const digitsOnly = compact.replace(/\D/g, "");
    if (digitsOnly.length < 7 || digitsOnly.length > 15) return null;
    return compact.startsWith("+") ? `+${digitsOnly}` : digitsOnly;
  };

  const haversineKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getTrackedLocationName = (lat, lng) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;

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
    let nearestKm = Infinity;
    for (const point of landmarks) {
      const km = haversineKm(nLat, nLng, point.lat, point.lng);
      if (km < nearestKm) {
        nearestKm = km;
        nearest = point;
      }
    }

    if (!nearest) return null;
    return nearestKm <= 6 ? nearest.name : "Addis Ababa Area";
  };

  const dialableReporterPhone = getDialablePhone(
    selectedIncident?.reporter_phone,
  );

  const getNearestHospital = (lat, lng) => {
    const nLat = Number(lat);
    const nLng = Number(lng);
    if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return null;

    const candidates = hospitals.filter((h) => {
      if (h.is_active === undefined || h.is_active === null) return true;
      return !!h.is_active;
    });
    if (candidates.length === 0) return null;

    let nearest = null;
    let nearestKm = Infinity;
    for (const h of candidates) {
      const hLat = Number(h.lat);
      const hLng = Number(h.lng);
      if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;
      const km = haversineKm(nLat, nLng, hLat, hLng);
      if (km < nearestKm) {
        nearestKm = km;
        nearest = h;
      }
    }
    if (!nearest) return null;
    return { hospital: nearest, distanceKm: nearestKm };
  };

  useEffect(() => {
    if (selectedIncident?.status === "Dispatched") {
      setHasUnitArrived(false);
      const hospitalCoord = [9.03, 38.74];
      const targetCoord = [selectedIncident.lat, selectedIncident.lng];
      let step = 0;
      const totalSteps = 100;

      const interval = setInterval(() => {
        if (step >= totalSteps) {
          setAmbulanceLocation(targetCoord);
          setHasUnitArrived(true);
          clearInterval(interval);
          return;
        }
        step++;
        const currentLat =
          hospitalCoord[0] +
          (targetCoord[0] - hospitalCoord[0]) * (step / totalSteps);
        const currentLng =
          hospitalCoord[1] +
          (targetCoord[1] - hospitalCoord[1]) * (step / totalSteps);
        setAmbulanceLocation([currentLat, currentLng]);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setAmbulanceLocation(null);
      setHasUnitArrived(false);
    }
  }, [selectedIncidentId, selectedIncident?.status]);

  useEffect(() => {
    const loadAssist = async () => {
      if (!selectedIncidentId) {
        setRecommendation(null);
        setTimeline([]);
        return;
      }
      try {
        const rec = await apiFetch(
          `/api/incidents/${selectedIncidentId}/recommendation`,
        );
        setRecommendation(rec.recommendation || null);
      } catch (error) {
        console.error("Decision assist load failed:", error.message);
      }

      try {
        const tl = await apiFetch(
          `/api/incidents/${selectedIncidentId}/timeline`,
        );
        setTimeline(tl.timeline || []);
      } catch (error) {
        console.error("Timeline load failed:", error.message);
        setTimeline([]);
      }
    };
    loadAssist();
  }, [selectedIncidentId]);

  useEffect(() => {
    const refreshDashboard = async (notifyOnNew = false) => {
      await Promise.all([
        fetchIncidents(notifyOnNew),
        fetchHospitals(),
        fetchVolunteers(),
      ]);
    };

    refreshDashboard(false);

    // Reset audio context if frozen
    const handleInteraction = () => {
      audioRef.current.load();
      window.removeEventListener("click", handleInteraction);
    };
    window.addEventListener("click", handleInteraction);

    const interval = setInterval(() => {
      refreshDashboard(true);
    }, 5000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("click", handleInteraction);
    };
  }, []);

  const fetchIncidents = async (notifyOnNew = false) => {
    try {
      const payload = await apiFetch("/api/incidents");
      const nextIncidents = payload.incidents || [];
      const newestIncident = nextIncidents[0] || null;
      const newestIncidentId = getIncidentId(newestIncident);

      if (
        notifyOnNew &&
        newestIncidentId &&
        lastIncidentIdRef.current &&
        newestIncidentId !== lastIncidentIdRef.current
      ) {
        playAlert();
        addNotification({
          type: "error",
          title: "NEW EMERGENCY",
          message: `Priority ${newestIncident.type} alert from ${newestIncident.reporter_phone || "Unknown"}`,
        });
      }

      lastIncidentIdRef.current = newestIncidentId || null;
      setIncidents(nextIncidents);
      if (selectedIncidentId) {
        const refreshedSelected = nextIncidents.find(
          (incident) => getIncidentId(incident) === selectedIncidentId,
        );
        if (refreshedSelected) {
          setSelectedIncident(refreshedSelected);
        }
      }
    } catch (error) {
      console.error("Fetch incidents failed:", error.message);
    }
  };

  const fetchVolunteers = async () => {
    try {
      const payload = await apiFetch("/api/volunteers/online");
      setVolunteers(payload.volunteers || []);
    } catch (error) {
      console.error("Fetch volunteers failed:", error.message);
    }
  };

  const fetchHospitals = async () => {
    try {
      const payload = await apiFetch("/api/hospitals");
      setHospitals(payload.hospitals || []);
    } catch (error) {
      console.error("Fetch hospitals failed:", error.message);
    }
  };

  const toggleSound = () => {
    if (!isSoundEnabled) {
      // Unlock the audio context by playing the dispatch chirp briefly
      const playPromise = dispatchAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsSoundEnabled(true);
            dispatchAudioRef.current.pause();
            dispatchAudioRef.current.currentTime = 0;

            // If an SOS arrived while muted, play the queued alert now
            if (pendingAlertRef.current && audioRef.current) {
              pendingAlertRef.current = false;
              setHasUnacknowledgedSOS(false);
              audioRef.current.currentTime = 0;
              audioRef.current
                .play()
                .catch((e) => console.log("Queued alert play failed:", e));
              addNotification({
                type: "error",
                title: "🚨 MISSED SOS ALERT",
                message:
                  "An SOS was received while audio was muted — playing now!",
              });
            } else {
              addNotification({
                type: "success",
                title: "Audio Enabled",
                message: "System alerts are now active.",
              });
            }
          })
          .catch((error) => {
            console.error("Audio enable failed:", error);
            addNotification({
              type: "error",
              title: "Audio Error",
              message: "Could not enable audio. Check browser permissions.",
            });
          });
      }
    } else {
      setIsSoundEnabled(false);
      pendingAlertRef.current = false;
      setHasUnacknowledgedSOS(false);
    }
  };

  const playAlert = () => {
    if (isSoundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    } else if (!isSoundEnabled) {
      // Queue the alert — show nudge UI so dispatcher knows they missed a sound
      pendingAlertRef.current = true;
      setHasUnacknowledgedSOS(true);
    }
  };

  const playDispatch = () => {
    if (isSoundEnabled && dispatchAudioRef.current) {
      dispatchAudioRef.current.currentTime = 0;
      dispatchAudioRef.current
        .play()
        .catch((e) => console.log("Audio play failed:", e));
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiFetch(`/api/incidents/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      if (status === "Dispatched") playDispatch();
      if (selectedIncidentId === id) {
        setSelectedIncident((prev) => ({ ...prev, status }));
      }
      fetchIncidents();
    } catch (error) {
      console.error("Status update failed:", error.message);
      addNotification({
        type: "error",
        title: "Action Failed",
        message: error.message || "Could not update status.",
      });
    }
  };

  const activeIncidents = [...incidents]
    .filter((inc) => inc.status !== "Resolved")
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const resolvedHistory = [...incidents]
    .filter((inc) => inc.status === "Resolved")
    .sort((a, b) => {
      const aTime = new Date(a.updated_at || a.created_at);
      const bTime = new Date(b.updated_at || b.created_at);
      return bTime - aTime;
    })
    .slice(0, 5);

  return (
    <div className="emergency-shell flex min-h-screen lg:h-screen flex-col lg:flex-row bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar - Incident List */}
      <aside className="w-full lg:w-[420px] lg:min-w-[420px] max-h-[52vh] lg:max-h-none bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-20">
        <header className="p-5 sm:p-8 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-black text-white flex items-center gap-2 tracking-tighter">
              <div className="bg-red-600 p-1.5 rounded-lg shadow-lg shadow-red-900/20">
                <Bell className="text-white w-5 h-5 fill-white" />
              </div>
              QUICKREACH <span className="text-red-600">HQ</span>
            </h1>
            <button
              onClick={() => setIsIVROpen(true)}
              className="bg-slate-800 p-1.5 rounded-lg border border-white/5 hover:bg-slate-700 transition-colors group"
              title="Launch IVR Simulator"
            >
              <Languages className="w-5 h-5 text-slate-400 group-hover:text-blue-400" />
            </button>

            {/* Sound toggle — glows red + pulses when an SOS arrived while muted */}
            <div className="relative ml-2">
              {hasUnacknowledgedSOS && (
                <span className="absolute -inset-1.5 rounded-xl bg-red-500 animate-ping opacity-60 pointer-events-none" />
              )}
              <button
                onClick={toggleSound}
                className={cn(
                  "relative bg-slate-800 p-1.5 rounded-lg border hover:bg-slate-700 transition-colors group",
                  isSoundEnabled
                    ? "border-green-500/30"
                    : hasUnacknowledgedSOS
                      ? "border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"
                      : "border-red-500/30",
                )}
                title={
                  isSoundEnabled
                    ? "Mute Alerts"
                    : hasUnacknowledgedSOS
                      ? "⚠️ SOS received — Click to enable sound!"
                      : "Enable Sound Alerts"
                }
              >
                {isSoundEnabled ? (
                  <Volume2 className="w-5 h-5 text-green-500" />
                ) : (
                  <VolumeX
                    className={cn(
                      "w-5 h-5",
                      hasUnacknowledgedSOS
                        ? "text-red-400 animate-pulse"
                        : "text-red-500",
                    )}
                  />
                )}
              </button>
            </div>
          </div>

          {/* Missed-SOS nudge banner */}
          {hasUnacknowledgedSOS && (
            <div className="mt-3 flex items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-xl px-3 py-2 animate-pulse">
              <Bell className="w-3.5 h-3.5 text-red-400 fill-red-400 shrink-0" />
              <p className="text-[10px] font-black text-red-400 uppercase tracking-wider flex-1">
                SOS received — Enable sound to hear alerts
              </p>
              <button
                onClick={() => {
                  pendingAlertRef.current = false;
                  setHasUnacknowledgedSOS(false);
                }}
                className="text-red-500 text-[9px] font-black uppercase tracking-widest hover:text-red-300 ml-1"
              >
                Dismiss
              </button>
            </div>
          )}
          <Link
            to="/analytics"
            className="text-[10px] text-blue-400 hover:text-blue-300 font-black uppercase tracking-widest"
          >
            Open Analytics Dashboard
          </Link>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            Emergency Dispatch Control
          </p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {activeIncidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 opacity-20">
              <Clock className="w-12 h-12 text-slate-400 mb-2" />
              <p className="font-black uppercase tracking-widest text-[10px] text-slate-400 text-center">
                No Active Signals
              </p>
            </div>
          )}

          {activeIncidents.map((incident) =>
            (() => {
              const incidentId = getIncidentId(incident);
              const nearestHospital = getNearestHospital(
                incident.lat,
                incident.lng,
              );
              const hosp = nearestHospital?.hospital || null;
              const currentCap = Number(hosp?.current_capacity || 0);
              const maxCap = Number(hosp?.max_capacity || 0);
              const full = maxCap > 0 && currentCap >= maxCap;
              return (
                <div
                  key={incidentId}
                  onClick={() => setSelectedIncident(incident)}
                  className={cn(
                    "p-5 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer group",
                    selectedIncidentId === incidentId
                      ? "bg-white border-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-[0.98]"
                      : "bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800",
                    incident.status === "Pending" &&
                      selectedIncidentId !== incidentId &&
                      "border-red-600/30 bg-red-600/5",
                  )}
                >
                  <div className="flex justify-between items-center mb-3">
                    <span
                      className={cn(
                        "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                        incident.type === "Fire"
                          ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                          : "bg-blue-500/10 border-blue-500/20 text-blue-500",
                        selectedIncidentId === incidentId &&
                          "bg-slate-900 text-white border-slate-900",
                      )}
                    >
                      {incident.type}
                    </span>
                    <span className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(incident.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h3
                      className={cn(
                        "text-lg font-black tracking-tight",
                        selectedIncidentId === incidentId
                          ? "text-slate-900"
                          : "text-slate-200",
                      )}
                    >
                      {incident.reporter_phone}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between">
                    <div
                      className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                        incident.status === "Pending"
                          ? "text-red-600 bg-red-600/10 animate-pulse"
                          : "text-green-600 bg-green-600/10",
                      )}
                    >
                      {incident.status}
                    </div>
                    <div className="flex gap-2">
                      <div className="text-[9px] font-black uppercase tracking-widest text-cyan-300 flex items-center gap-1 bg-slate-800/90 border border-cyan-400/30 px-2 py-1 rounded-lg">
                        <MapPin className="w-3 h-3 text-cyan-300" />
                        {Number.isFinite(Number(incident.lat)) &&
                        Number.isFinite(Number(incident.lng))
                          ? getTrackedLocationName(
                              incident.lat,
                              incident.lng,
                            ) ||
                            `${Number(incident.lat).toFixed(4)}, ${Number(incident.lng).toFixed(4)}`
                          : "Location N/A"}
                      </div>
                      {incident.status === "Pending" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatus(incidentId, "Dispatched");
                          }}
                          className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-red-600 transition-colors shadow-lg"
                        >
                          ACTIVATE
                        </button>
                      )}
                    </div>
                  </div>
                  {hosp && (
                    <div
                      className={cn(
                        "mt-3 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 px-2 py-1 rounded-lg border w-fit",
                        full
                          ? "text-red-300 bg-red-900/30 border-red-400/30"
                          : "text-emerald-300 bg-emerald-900/30 border-emerald-400/30",
                      )}
                      title={`${hosp.name} (${currentCap}/${maxCap})`}
                    >
                      Nearest Hospital: {hosp.name}{" "}
                      {maxCap > 0 ? `${currentCap}/${maxCap}` : ""}
                    </div>
                  )}
                </div>
              );
            })(),
          )}

          {/* Resolved History Section */}
          {resolvedHistory.length > 0 && (
            <div className="mt-10">
              <div className="flex items-center gap-2 mb-4 px-2">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Recent History
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              <div className="space-y-2">
                {resolvedHistory.map((incident) =>
                  (() => {
                    const incidentId = getIncidentId(incident);
                    return (
                      <div
                        key={incidentId}
                        onClick={() => setSelectedIncident(incident)}
                        className={cn(
                          "p-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between",
                          selectedIncidentId === incidentId
                            ? "bg-slate-100 border-white text-slate-900"
                            : "bg-slate-800/20 border-white/5 text-slate-500 hover:bg-slate-800/40",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle
                            className={cn(
                              "w-4 h-4",
                              selectedIncidentId === incidentId
                                ? "text-green-600"
                                : "text-slate-600",
                            )}
                          />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-tight line-clamp-1">
                              {incident.reporter_phone}
                            </p>
                            <p className="text-[8px] font-bold opacity-50 uppercase tracking-widest">
                              {incident.type} • Resolved
                            </p>
                          </div>
                        </div>
                        <span className="text-[8px] font-bold opacity-40">
                          {new Date(incident.created_at).toLocaleTimeString(
                            [],
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                      </div>
                    );
                  })(),
                )}
              </div>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col">
        <div className="flex-1 bg-slate-950 relative">
          <IncidentMap
            userLocation={
              selectedIncident
                ? [selectedIncident.lat, selectedIncident.lng]
                : null
            }
            ambulanceLocation={ambulanceLocation}
            allIncidents={incidents}
            showHeatmap={showHeatmap}
            volunteers={volunteers}
            showVolunteers={showVolunteers}
            nearestHospital={null}
            className="h-[28vh] sm:h-[36vh] lg:h-[50vh] rounded-none border-0 shadow-none"
          />

          <div className="absolute top-10 right-10 z-10 hidden sm:flex flex-col gap-2 scale-90 origin-top-right">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-2xl backdrop-blur-md w-48 text-left flex justify-between items-center group",
                showHeatmap
                  ? "bg-orange-600 text-white border-orange-400"
                  : "bg-slate-900/80 text-slate-400 border-white/5",
              )}
            >
              <span>Density Heatmap</span>
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  showHeatmap ? "bg-white animate-pulse" : "bg-slate-700",
                )}
              />
            </button>

            <button
              onClick={() => setShowVolunteers(!showVolunteers)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-2xl backdrop-blur-md w-48 text-left flex justify-between items-center",
                showVolunteers
                  ? "bg-blue-600 text-white border-blue-400"
                  : "bg-slate-900/80 text-slate-400 border-white/5",
              )}
            >
              <span>Volunteer Network</span>
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  showVolunteers ? "bg-white animate-pulse" : "bg-slate-700",
                )}
              />
            </button>
          </div>

          <EmergencyChat
            incidentId={selectedIncidentId}
            senderType="dispatcher"
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />

          {/* Overlay Grid Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Top Info Bar */}
          {!selectedIncident && (
            <div className="absolute top-10 left-10 z-10 animate-in fade-in slide-in-from-left duration-700">
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-[2.5rem] shadow-2xl min-w-[300px]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-1">
                      Fleet Telemetry
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-2xl font-black italic tracking-tighter text-white">
                        READY
                      </span>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-1">
                      Signal Mode
                    </p>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      Satellite Mesh
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500 uppercase tracking-widest">
                      Network Load
                    </span>
                    <span className="text-white">12%</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[12%]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {selectedIncident && (
          <div className="p-3 sm:p-4 sm:pb-8 bg-slate-900 border-t border-slate-800 z-30 animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="max-w-6xl mx-auto flex flex-col xl:flex-row items-stretch gap-6 xl:gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-600 w-2 h-10 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>
                  <div>
                    <h2 className="text-2xl font-black text-white italic tracking-tight uppercase">
                      Emergency Profile
                    </h2>
                    <p className="text-slate-500 text-[9px] font-bold tracking-[0.2em]">
                      Live Telemetry & Geodata
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    {
                      label: "Incident ID",
                      val: `#${String(selectedIncidentId || "N/A").slice(0, 8)}`,
                      color: "text-white",
                    },
                    {
                      label: "Priority",
                      val: selectedIncident.triage_score || "N/A",
                      color: "text-red-500",
                    },
                    {
                      label: "Status",
                      val: selectedIncident.status,
                      color: "text-green-500",
                    },
                    {
                      label: "Telemetry",
                      val: `${selectedIncident.lat.toFixed(6)}, ${selectedIncident.lng.toFixed(6)}`,
                      color: "text-slate-400 text-xs",
                    },
                  ].map((stat, i) => (
                    <div
                      key={i}
                      className="bg-slate-800/50 p-3 rounded-2xl border border-white/5"
                    >
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        {stat.label}
                      </p>
                      <p
                        className={cn(
                          "font-black tracking-tighter text-sm",
                          stat.color,
                        )}
                      >
                        {stat.val}
                      </p>
                    </div>
                  ))}
                </div>
                {selectedIncident.sla_due_at && (
                  <p className="text-xs text-amber-400 mt-3 font-bold">
                    SLA Due:{" "}
                    {new Date(selectedIncident.sla_due_at).toLocaleTimeString()}
                  </p>
                )}

                {recommendation && (
                  <div className="mt-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                      Decision Assist
                    </p>
                    <p className="text-sm font-bold text-white">
                      {recommendation.hospital_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      ETA: {recommendation.eta_minutes} min
                    </p>
                    <p className="text-xs text-slate-400">
                      Capacity confidence:{" "}
                      {(recommendation.capacity_confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                )}
              </div>

              <div className="w-px bg-slate-800"></div>

              <div className="w-72 flex flex-col justify-center gap-3">
                <div className="flex items-center gap-2">
                  {dialableReporterPhone ? (
                    <button
                      className="flex-1 bg-white text-slate-900 py-2 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 transition-all text-sm"
                      onClick={() =>
                        window.open(`tel:${dialableReporterPhone}`)
                      }
                    >
                      <Phone className="w-4 h-4 fill-slate-900" />
                      CALL
                    </button>
                  ) : (
                    <div className="flex-1 bg-slate-800 text-slate-400 py-2 rounded-2xl font-black flex items-center justify-center gap-2 border border-white/10 text-sm">
                      <Phone className="w-4 h-4" />
                      NO PHONE
                    </div>
                  )}

                  <button
                    className="px-3 py-2 bg-blue-600/20 text-blue-400 rounded-2xl font-black text-xs flex items-center gap-2 border border-blue-500/20 hover:bg-blue-600/30 transition-all"
                    onClick={() => setIsChatOpen(true)}
                    title="Open incident chat"
                  >
                    <MessageCircle className="w-4 h-4" />
                    CHAT
                  </button>

                  <button
                    className="px-3 py-2 bg-emerald-600/20 text-emerald-400 rounded-2xl font-black text-xs flex items-center gap-2 border border-emerald-500/20 hover:bg-emerald-600/30 transition-all"
                    onClick={() => setIsVideoCallOpen(true)}
                    title="Start live video call for this incident"
                  >
                    <Video className="w-4 h-4" />
                    VIDEO
                  </button>
                </div>

                {dialableReporterPhone && (
                  <div className="text-xs text-slate-400 mt-1 text-center break-words">
                    {dialableReporterPhone}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {selectedIncident.status !== "Resolved" && (
                    <>
                      {selectedIncident.status === "Dispatched" && (
                        <div
                          className={cn(
                            "col-span-2 px-3 py-2 rounded-2xl border text-center",
                            hasUnitArrived
                              ? "bg-green-500/15 border-green-500/30"
                              : "bg-blue-500/10 border-blue-500/30",
                          )}
                        >
                          <p
                            className={cn(
                              "text-[10px] font-black uppercase tracking-widest",
                              hasUnitArrived
                                ? "text-green-400"
                                : "text-blue-400",
                            )}
                          >
                            {hasUnitArrived
                              ? "Unit Arrived At Incident Site"
                              : "Unit En Route To Incident"}
                          </p>
                        </div>
                      )}
                      <button
                        className="bg-red-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() =>
                          updateStatus(selectedIncidentId, "Dispatched")
                        }
                        disabled={selectedIncident.status === "Dispatched"}
                      >
                        {selectedIncident.status === "Dispatched"
                          ? "DISPATCHED"
                          : "DISPATCH"}
                      </button>
                      <button
                        className="bg-slate-800 text-white py-3 rounded-2xl font-black text-xs hover:bg-slate-700 border border-white/5 italic"
                        onClick={() =>
                          updateStatus(selectedIncidentId, "Resolved")
                        }
                      >
                        RESOLVE
                      </button>
                    </>
                  )}
                  {selectedIncident.status === "Resolved" && (
                    <div className="col-span-2 bg-slate-800/50 p-3 rounded-2xl border border-white/5 text-center">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Incident Closed
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-800/40 p-3 rounded-2xl border border-white/5 max-h-28 overflow-y-auto">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Incident Timeline
                  </p>
                  {timeline.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      No timeline events yet.
                    </p>
                  ) : (
                    timeline
                      .slice(-5)
                      .reverse()
                      .map((evt, idx) => (
                        <div
                          key={
                            evt.id ||
                            evt._id ||
                            `${evt.created_at || ""}-${idx}`
                          }
                          className="mb-2"
                        >
                          <p className="text-[10px] text-white font-bold">
                            {evt.event_type}
                          </p>
                          <p className="text-[9px] text-slate-500">
                            {new Date(evt.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <IVRSimulator isOpen={isIVROpen} onClose={() => setIsIVROpen(false)} />
      {isVideoCallOpen && (
        <VideoSOSModal
          onClose={() => setIsVideoCallOpen(false)}
          roomName={videoRoomName}
          displayName="Dispatcher"
        />
      )}

      <audio ref={audioRef} src={ALERT_SOUND_URL} preload="auto" />
      <audio ref={dispatchAudioRef} src={DISPATCH_SOUND_URL} preload="auto" />
    </div>
  );
};
