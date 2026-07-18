import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Phone,
  Navigation,
  Info,
  Video,
  Heart,
  CheckCircle,
  MessageCircle,
  MapPin,
  Clock,
  AlertTriangle,
  Radio,
  Send,
  PhoneCall,
  User,
  Hospital,
  FileText,
  Check,
  Circle,
  Loader,
  Truck,
  Ambulance,
  ChevronRight,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IncidentMap } from "../components/IncidentMap";
import { apiFetch } from "../lib/api";
import { connectSocket } from "../lib/socket";
import { VideoSOSModal } from "../components/VideoSOSModal";
import { EmergencyChat } from "../components/EmergencyChat";

const DISPATCH_ALERT_URL =
  "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";

export const PanicPage = () => {
  const [activeIncident, setActiveIncident] = useState(null);
  const [incidentAccessToken, setIncidentAccessToken] = useState(null);
  const [location, setLocation] = useState(null);
  const [incidentType, setIncidentType] = useState("Medical");
  const [showVideoSOS, setShowVideoSOS] = useState(false);
  const [isCitizenChatOpen, setIsCitizenChatOpen] = useState(false);
  const dispatchAlertRef = useRef(null);
  const seenDispatcherMessageIdsRef = useRef(new Set());
  const responderIntervalRef = useRef(null);
  const dispatchSimStartedRef = useRef(false);
  const locationRef = useRef(null);
  const lastIncidentStatusRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const messagesEndRef = useRef(null);

  const [incidentStatus, setIncidentStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [responderLocation, setResponderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [volunteerName, setVolunteerName] = useState("Abebe Tadesse");
  const [hospitalName, setHospitalName] = useState("St. Paul Hospital");
  const [referenceNumber, setReferenceNumber] = useState("QR-82918");
  const [timeline, setTimeline] = useState([
    { label: "Alert Sent", completed: true },
    { label: "Dispatcher Assigned", completed: true },
    { label: "Volunteer Accepted", completed: true },
    { label: "En Route", completed: false, active: true },
    { label: "Arrived", completed: false },
    { label: "Resolved", completed: false },
  ]);

  const videoRoomName = activeIncident?.id
    ? `quickreach-incident-${activeIncident.id}`
    : "";

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const stopResponderSimulation = () => {
    if (responderIntervalRef.current) {
      clearInterval(responderIntervalRef.current);
      responderIntervalRef.current = null;
    }
  };

  const getOrCreateReporterId = () => {
    const key = "quickreach_reporter_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = `WEB-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    localStorage.setItem(key, created);
    return created;
  };

  const resetIncidentView = () => {
    setActiveIncident(null);
    setIncidentAccessToken(null);
    setMessages([]);
    stopResponderSimulation();
    dispatchSimStartedRef.current = false;
    setResponderLocation(null);
    setIncidentStatus(null);
    setIsCitizenChatOpen(false);
    setEta(null);
    setDistance(null);
    setTimeline([
      { label: "Alert Sent", completed: true },
      { label: "Dispatcher Assigned", completed: true },
      { label: "Volunteer Accepted", completed: true },
      { label: "En Route", completed: false, active: true },
      { label: "Arrived", completed: false },
      { label: "Resolved", completed: false },
    ]);
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        locationRef.current = nextLocation;
        setLocation(nextLocation);
      },
      (error) => console.error(error),
      { enableHighAccuracy: true },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!activeIncident?.id) return;

    const incidentId = activeIncident.id;
    const incidentToken =
      incidentAccessToken || activeIncident?.id || activeIncident?._id;
    const socket = connectSocket();

    const addMessage = (text) => {
      setMessages((prev) => [
        ...prev,
        { time: new Date().toLocaleTimeString(), text },
      ]);
    };

    const applyIncidentUpdate = (nextIncident) => {
      if (!nextIncident) return;

      const newStatus = nextIncident.status;
      const previousStatus = lastIncidentStatusRef.current;
      setIncidentStatus(newStatus);
      setActiveIncident((prev) => ({ ...prev, ...nextIncident }));
      lastIncidentStatusRef.current = newStatus;

      if (newStatus === "Dispatched" && previousStatus !== "Dispatched") {
        if (!dispatchSimStartedRef.current) {
          addMessage("🚑 Dispatcher activated your case. Help is on the way.");
          addMessage(
            "📡 Nearest unit dispatched. Unit is en route. Stay calm.",
          );
          // Update timeline
          setTimeline((prev) => {
            const newTimeline = [...prev];
            const enRouteIndex = newTimeline.findIndex(
              (t) => t.label === "En Route",
            );
            if (enRouteIndex !== -1) {
              newTimeline[enRouteIndex].completed = true;
              newTimeline[enRouteIndex].active = false;
            }
            const arrivedIndex = newTimeline.findIndex(
              (t) => t.label === "Arrived",
            );
            if (arrivedIndex !== -1) {
              newTimeline[arrivedIndex].active = true;
            }
            return newTimeline;
          });
        }

        if (dispatchAlertRef.current && !isMuted) {
          dispatchAlertRef.current.volume = 0.8;
          dispatchAlertRef.current.play().catch(() => {});
        }

        if (!dispatchSimStartedRef.current && locationRef.current) {
          dispatchSimStartedRef.current = true;
          startResponderSimulation();
        }
      }

      if (newStatus === "Resolved" && previousStatus !== "Resolved") {
        addMessage("✅ Incident marked resolved by dispatcher. Stay safe.");
        stopResponderSimulation();
        dispatchSimStartedRef.current = false;
        setResponderLocation(null);
        setTimeline((prev) =>
          prev.map((t) => ({ ...t, completed: true, active: false })),
        );
      }
    };

    const syncIncident = async () => {
      try {
        const payload = await apiFetch(`/api/incidents/${incidentId}`, {
          auth: false,
          headers: incidentToken
            ? { "x-incident-token": incidentToken }
            : undefined,
        });
        applyIncidentUpdate(payload.incident);
      } catch (error) {
        console.error("Incident status sync failed:", error.message);
      }
    };

    const loadDispatcherMessages = async () => {
      try {
        const payload = await apiFetch(`/api/messages/${incidentId}`, {
          auth: false,
          headers: incidentToken
            ? { "x-incident-token": incidentToken }
            : undefined,
        });
        (payload.messages || []).forEach((msg) => {
          if (!msg || msg.sender !== "dispatcher") return;
          const messageId = msg.id || msg._id;
          if (messageId && seenDispatcherMessageIdsRef.current.has(messageId)) {
            return;
          }
          if (messageId) {
            seenDispatcherMessageIdsRef.current.add(messageId);
          }
          setMessages((prev) => [
            ...prev,
            {
              time: new Date(msg.created_at || Date.now()).toLocaleTimeString(),
              text: msg.message,
            },
          ]);
        });
      } catch (error) {
        console.error("Load dispatcher messages failed:", error.message);
      }
    };

    const handleIncidentChannelUpdate = (nextIncident) => {
      if (!nextIncident) return;
      if (
        String(nextIncident.id || nextIncident._id || "") !== String(incidentId)
      ) {
        return;
      }
      applyIncidentUpdate(nextIncident);
    };

    const handleMessageChannelUpdate = (msg) => {
      if (!msg || msg.sender !== "dispatcher") return;
      const messageId = msg.id || msg._id;
      if (messageId && seenDispatcherMessageIdsRef.current.has(messageId))
        return;
      if (messageId) seenDispatcherMessageIdsRef.current.add(messageId);
      setMessages((prev) => [
        ...prev,
        {
          time: new Date(msg.created_at || Date.now()).toLocaleTimeString(),
          text: msg.message,
        },
      ]);
    };

    addMessage("🆘 Alert received by dispatch. Standby...");
    setIncidentStatus(activeIncident.status);
    lastIncidentStatusRef.current = activeIncident.status;

    socket.on(`incident-${incidentId}`, handleIncidentChannelUpdate);
    socket.on("incident-updated", handleIncidentChannelUpdate);
    socket.on(`message-${incidentId}`, handleMessageChannelUpdate);

    syncIncident();
    loadDispatcherMessages();

    return () => {
      socket.off(`incident-${incidentId}`, handleIncidentChannelUpdate);
      socket.off("incident-updated", handleIncidentChannelUpdate);
      socket.off(`message-${incidentId}`, handleMessageChannelUpdate);
      stopResponderSimulation();
      dispatchSimStartedRef.current = false;
    };
  }, [activeIncident?.id]);

  const startResponderSimulation = () => {
    const currentLocation = locationRef.current || location;
    if (!currentLocation) return;
    stopResponderSimulation();

    const startLoc = {
      lat: currentLocation.lat + 0.01,
      lng: currentLocation.lng + 0.01,
    };
    setResponderLocation(startLoc);

    const steps = 60;
    let currentStep = 0;

    responderIntervalRef.current = setInterval(() => {
      currentStep += 1;
      const progress = currentStep / steps;

      const newLat =
        startLoc.lat + (currentLocation.lat - startLoc.lat) * progress;
      const newLng =
        startLoc.lng + (currentLocation.lng - startLoc.lng) * progress;
      setResponderLocation({ lat: newLat, lng: newLng });

      const R = 6371;
      const dLat = ((currentLocation.lat - newLat) * Math.PI) / 180;
      const dLng = ((currentLocation.lng - newLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((newLat * Math.PI) / 180) *
          Math.cos((currentLocation.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistance(d.toFixed(2));
      setEta(Math.ceil(((steps - currentStep) / 60) * 2));

      if (currentStep >= steps) {
        stopResponderSimulation();
        setMessages((prev) => [
          ...prev,
          {
            time: new Date().toLocaleTimeString(),
            text: "📍 Unit has arrived at your location.",
          },
        ]);
        setEta(0);
        setTimeline((prev) => {
          const newTimeline = [...prev];
          const arrivedIndex = newTimeline.findIndex(
            (t) => t.label === "Arrived",
          );
          if (arrivedIndex !== -1) {
            newTimeline[arrivedIndex].completed = true;
            newTimeline[arrivedIndex].active = false;
          }
          const resolvedIndex = newTimeline.findIndex(
            (t) => t.label === "Resolved",
          );
          if (resolvedIndex !== -1) {
            newTimeline[resolvedIndex].active = true;
          }
          return newTimeline;
        });
      }
    }, 1000);
  };

  const handlePanic = async () => {
    if (!location) {
      alert("Acquiring location...");
      return;
    }

    try {
      const reporterId = getOrCreateReporterId();
      const incident = await apiFetch("/api/incidents/public", {
        method: "POST",
        auth: false,
        body: {
          type: incidentType,
          lat: location.lat,
          lng: location.lng,
          reporter_phone: reporterId,
          description: "Panic Button Pressed",
        },
      });

      const incidentData = incident.incident || incident;
      if (incidentData._id && !incidentData.id) {
        incidentData.id = incidentData._id;
      }
      setActiveIncident(incidentData);
      setIncidentAccessToken(incident.incident_access_token || null);
      setIsCitizenChatOpen(true);
    } catch (err) {
      console.error("Panic failed:", err);
      alert("Failed to send alert. Call 911 manually.");
    }
  };

  const statusLabel =
    {
      Pending: "🔄 Waiting for Dispatcher...",
      Dispatched: "🚑 Help is on the way!",
      Resolved: "✅ Incident Resolved",
    }[incidentStatus] || "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#020617] text-white font-sans overflow-x-hidden">
      {/* Background decorative elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-50%] right-[-20%] w-[600px] h-[600px] bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/3 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border-b border-[rgba(255,255,255,0.08)] p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">QuickReach</h1>
              <span className="text-xs text-[#94A3B8]">SOS Emergency</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-xl backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] hover:border-white/20 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-[#94A3B8]" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#94A3B8]" />
              )}
            </button>
            <a
              href="tel:911"
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
            >
              <PhoneCall className="w-4 h-4" />
              Call 911
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-10 p-4">
        {!activeIncident ? (
          // Initial State - SOS Button
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Emergency SOS</h2>
              <p className="text-[#94A3B8]">
                Press the button below for immediate help
              </p>
            </div>

            <div className="grid grid-cols-4 gap-3 w-full max-w-md">
              {["Medical", "Fire", "Traffic", "Security"].map((type) => (
                <button
                  key={type}
                  onClick={() => setIncidentType(type)}
                  className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all ${
                    incidentType === type
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : "border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:border-[rgba(255,255,255,0.2)]"
                  }`}
                >
                  <span className="block text-xl mb-1">
                    {type === "Medical" && "🏥"}
                    {type === "Fire" && "🔥"}
                    {type === "Traffic" && "🚗"}
                    {type === "Security" && "🔒"}
                  </span>
                  {type}
                </button>
              ))}
            </div>

            <button
              onClick={handlePanic}
              disabled={!location}
              className="relative w-48 h-48 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-2xl shadow-red-500/30 flex flex-col items-center justify-center gap-1 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
              <ShieldAlert className="h-16 w-16 animate-pulse text-white drop-shadow-lg" />
              <span className="text-3xl font-black tracking-widest text-white drop-shadow-lg">
                SOS
              </span>
              <span className="text-xs font-medium text-white/80 uppercase tracking-wide">
                Press for Help
              </span>
              {!location && (
                <div className="absolute inset-0 rounded-full backdrop-blur-sm bg-black/50 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">
                    📍 Acquiring...
                  </span>
                </div>
              )}
            </button>

            {location && (
              <div className="text-xs text-[#94A3B8] text-center">
                <MapPin className="w-3 h-3 inline mr-1" />
                Location acquired • Ready to send
              </div>
            )}
          </div>
        ) : (
          // Active Incident View
          <div className="flex gap-4 items-start">
            <div className="flex-1 space-y-4 min-w-0">
              {/* Status Header */}
              <div className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-400 uppercase tracking-widest bg-red-400/10 px-3 py-1 rounded-full">
                        {incidentType} Emergency
                      </span>
                      <span className="text-xs text-[#94A3B8]">•</span>
                      <span className="text-xs text-[#94A3B8]">
                        {referenceNumber}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                        <span className="text-sm font-semibold text-[#10B981]">
                          {incidentStatus === "Dispatched"
                            ? "Volunteer En Route"
                            : incidentStatus === "Resolved"
                              ? "Incident Resolved"
                              : "Waiting for Dispatcher"}
                        </span>
                      </div>
                      {eta && (
                        <div className="flex items-center gap-1 text-sm text-[#94A3B8]">
                          <Clock className="w-4 h-4" />
                          ETA:{" "}
                          <span className="text-white font-bold">
                            {eta} min
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={resetIncidentView}
                    className="text-xs text-[#94A3B8] hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {/* Map */}
              <div
                className={`backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl overflow-hidden transition-all duration-300 ${mapExpanded ? "fixed inset-4 z-50" : ""}`}
              >
                {mapExpanded && (
                  <div className="absolute top-4 right-4 z-10">
                    <button
                      onClick={() => setMapExpanded(false)}
                      className="p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-black/70 transition-colors"
                    >
                      <Minimize2 className="w-5 h-5 text-white" />
                    </button>
                  </div>
                )}
                <div
                  className={`relative ${mapExpanded ? "h-full" : "h-[300px]"}`}
                >
                  <IncidentMap
                    userLocation={location && [location.lat, location.lng]}
                    activeIncident={activeIncident}
                    ambulanceLocation={
                      responderLocation && [
                        responderLocation.lat,
                        responderLocation.lng,
                      ]
                    }
                    className="h-full rounded-3xl border-0 shadow-none"
                  />
                  <button
                    onClick={() => setMapExpanded(!mapExpanded)}
                    className="absolute top-4 left-4 p-2 rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 hover:bg-black/70 transition-colors"
                  >
                    <Maximize2 className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <div className="w-2 h-2 bg-[#10B981] rounded-full animate-pulse" />
                      <span className="text-white">📍 You</span>
                    </div>
                    {activeIncident && (
                      <div className="flex items-center gap-2 text-xs bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                        <Ambulance className="w-3 h-3 text-red-500" />
                        <span className="text-white">🚑 Volunteer</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Volunteer & Hospital Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Volunteer</p>
                      <p className="text-sm font-bold">{volunteerName}</p>
                    </div>
                  </div>
                </div>
                <div className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/20 flex items-center justify-center">
                      <Hospital className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-[#94A3B8]">Hospital</p>
                      <p className="text-sm font-bold">{hospitalName}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4">
                  Emergency Timeline
                </h3>
                <div className="space-y-3">
                  {timeline.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="relative flex items-center justify-center">
                        {item.completed ? (
                          <div className="w-6 h-6 rounded-full bg-[#10B981]/20 border border-[#10B981] flex items-center justify-center">
                            <Check className="w-3 h-3 text-[#10B981]" />
                          </div>
                        ) : item.active ? (
                          <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center animate-pulse">
                            <Loader className="w-3 h-3 text-red-500 animate-spin" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-[rgba(255,255,255,0.1)] flex items-center justify-center">
                            <Circle className="w-3 h-3 text-[#94A3B8]" />
                          </div>
                        )}
                        {index < timeline.length - 1 && (
                          <div
                            className={`absolute top-6 w-0.5 h-4 ${
                              item.completed
                                ? "bg-[#10B981]/30"
                                : "bg-[rgba(255,255,255,0.05)]"
                            }`}
                          />
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-medium ${
                            item.completed
                              ? "text-[#10B981]"
                              : item.active
                                ? "text-white"
                                : "text-[#94A3B8]"
                          }`}
                        >
                          {item.label}
                        </p>
                      </div>
                      {item.active && (
                        <span className="ml-auto text-xs text-red-400 animate-pulse">
                          ● In Progress
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dispatcher Messages */}
              <div className="backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#94A3B8] mb-4 flex items-center gap-2">
                  <Radio className="w-3 h-3 text-red-400" />
                  Dispatcher Updates
                  <span className="ml-auto text-[10px] text-[#94A3B8]/60">
                    {messages.length} messages
                  </span>
                </h3>
                <div className="max-h-40 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 text-sm animate-fadeIn"
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <span className="text-[#94A3B8] font-mono text-xs whitespace-nowrap flex-shrink-0">
                        {msg.time}
                      </span>
                      <span className="text-white/80 break-words">
                        {msg.text}
                      </span>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <span className="text-[#94A3B8] italic text-sm">
                      Connecting to dispatch...
                    </span>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={() => setIsCitizenChatOpen(true)}
                  disabled={!activeIncident}
                  className="p-4 rounded-2xl backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center gap-1"
                >
                  <MessageCircle className="w-5 h-5 text-blue-400" />
                  <span className="text-xs text-[#94A3B8]">Chat</span>
                </button>
                <button
                  onClick={() => setShowVideoSOS(true)}
                  disabled={!activeIncident}
                  className="p-4 rounded-2xl backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex flex-col items-center gap-1"
                >
                  <Video className="w-5 h-5 text-red-400" />
                  <span className="text-xs text-[#94A3B8]">Video</span>
                </button>

                <a
                  href="/first-aid"
                  className="p-4 rounded-2xl backdrop-blur-xl bg-[rgba(15,23,42,0.65)] border border-[rgba(255,255,255,0.08)] hover:border-white/20 transition-all flex flex-col items-center gap-1"
                >
                  <Heart className="w-5 h-5 text-pink-400" />
                  <span className="text-xs text-[#94A3B8]">First Aid</span>
                </a>

                <a
                  href="tel:911"
                  className="p-4 rounded-2xl bg-red-600 hover:bg-red-500 transition-all flex flex-col items-center gap-1"
                >
                  <PhoneCall className="w-5 h-5 text-white" />
                  <span className="text-xs text-white">Emergency</span>
                </a>
              </div>
            </div>

            {/* Chat Panel */}
            {isCitizenChatOpen && (
              <div className="w-80 shrink-0 sticky top-4 h-[600px]">
                <EmergencyChat
                  incidentId={activeIncident?.id}
                  senderType="citizen"
                  isOpen={!!activeIncident?.id}
                  onClose={() => setIsCitizenChatOpen(false)}
                  requireAuth={false}
                  publicIncidentToken={incidentAccessToken}
                  inline
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showVideoSOS && (
        <VideoSOSModal
          onClose={() => setShowVideoSOS(false)}
          roomName={videoRoomName}
          displayName="Citizen"
        />
      )}

      <audio ref={dispatchAlertRef} src={DISPATCH_ALERT_URL} preload="auto" />
    </div>
  );
};

const styles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.25);
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out forwards;
  }
`;
