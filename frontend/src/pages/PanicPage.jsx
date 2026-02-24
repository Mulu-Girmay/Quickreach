import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Phone, Navigation, Info, Video, Heart, CheckCircle, MessageCircle, Share2, ArrowLeft, Shield } from 'lucide-react';
import { IncidentMap } from '../components/IncidentMap';
import { apiFetch } from '../lib/api';
import { VideoSOSModal } from '../components/VideoSOSModal';
import { supabase } from '../lib/supabase';
import { EmergencyChat } from '../components/EmergencyChat';
import { ShareLocation } from '../components/ShareLocation';
import { SafetyTips } from '../components/SafetyTips';
import { Link } from 'react-router-dom';

const DISPATCH_ALERT_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const PanicPage = () => {
  const [activeIncident, setActiveIncident] = useState(null);
  const [incidentAccessToken, setIncidentAccessToken] = useState(null);
  const [location, setLocation] = useState(null);
  const [incidentType, setIncidentType] = useState('Medical');
  const [showVideoSOS, setShowVideoSOS] = useState(false);
  const [isCitizenChatOpen, setIsCitizenChatOpen] = useState(false);
  const dispatchAlertRef = useRef(null);
  const seenDispatcherMessageIdsRef = useRef(new Set());
  const responderIntervalRef = useRef(null);
  const dispatchSimStartedRef = useRef(false);
  const locationRef = useRef(null);

  const [incidentStatus, setIncidentStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [responderLocation, setResponderLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isShareLocationOpen, setIsShareLocationOpen] = useState(false);
  const [showSafetyTips, setShowSafetyTips] = useState(false);

  const videoRoomName = activeIncident?.id ? `quickreach-incident-${activeIncident.id}` : '';

  const stopResponderSimulation = () => {
    if (responderIntervalRef.current) {
      clearInterval(responderIntervalRef.current);
      responderIntervalRef.current = null;
    }
  };

  const getOrCreateReporterId = () => {
    const key = 'quickreach_reporter_id';
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
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        locationRef.current = nextLocation;
        setLocation(nextLocation);
      },
      (error) => console.error(error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!activeIncident?.id) return;

    const addMessage = (text) => {
      setMessages((prev) => [...prev, { time: new Date().toLocaleTimeString(), text }]);
    };

    addMessage('Alert received by dispatch. Standby...');
    setIncidentStatus(activeIncident.status);

    const channel = supabase
      .channel(`incident-${activeIncident.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'incidents',
          filter: `id=eq.${activeIncident.id}`
        },
        (payload) => {
          const newStatus = payload.new.status;
          setIncidentStatus(newStatus);
          setActiveIncident((prev) => ({ ...prev, ...payload.new }));

          if (newStatus === 'Dispatched') {
            if (!dispatchSimStartedRef.current) {
              addMessage('Dispatcher activated your case. Help is on the way.');
              addMessage('Nearest unit dispatched. Unit is en route. Stay calm.');
            }

            if (dispatchAlertRef.current) {
              dispatchAlertRef.current.volume = 0.8;
              dispatchAlertRef.current.play().catch(() => {});
            }

            if (!dispatchSimStartedRef.current && locationRef.current) {
              dispatchSimStartedRef.current = true;
              startResponderSimulation();
            }
          }

          if (newStatus === 'Resolved') {
            addMessage('Incident marked resolved by dispatcher. Stay safe.');
            stopResponderSimulation();
            dispatchSimStartedRef.current = false;
            setResponderLocation(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      stopResponderSimulation();
      dispatchSimStartedRef.current = false;
    };
  }, [activeIncident?.id]);

  useEffect(() => {
    if (!activeIncident?.id || !incidentAccessToken) return;
    seenDispatcherMessageIdsRef.current.clear();

    const appendDispatcherMessage = (msg) => {
      if (!msg || msg.sender !== 'dispatcher') return;
      if (seenDispatcherMessageIdsRef.current.has(msg.id)) return;
      seenDispatcherMessageIdsRef.current.add(msg.id);
      setMessages((prev) => [
        ...prev,
        {
          time: new Date(msg.created_at || Date.now()).toLocaleTimeString(),
          text: msg.message
        }
      ]);
    };

    const loadExisting = async () => {
      try {
        const payload = await apiFetch(`/api/messages/${activeIncident.id}`, {
          auth: false,
          headers: { 'x-incident-token': incidentAccessToken }
        });
        (payload.messages || []).forEach(appendDispatcherMessage);
      } catch (error) {
        console.error('Load dispatcher messages failed:', error.message);
      }
    };
    loadExisting();

    const msgChannel = supabase
      .channel(`incident-messages-${activeIncident.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incident_messages',
          filter: `incident_id=eq.${activeIncident.id}`
        },
        (payload) => appendDispatcherMessage(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(msgChannel);
  }, [activeIncident?.id, incidentAccessToken]);

  const startResponderSimulation = () => {
    const currentLocation = locationRef.current || location;
    if (!currentLocation) return;
    stopResponderSimulation();

    const startLoc = { lat: currentLocation.lat + 0.01, lng: currentLocation.lng + 0.01 };
    setResponderLocation(startLoc);

    const steps = 60;
    let currentStep = 0;

    responderIntervalRef.current = setInterval(() => {
      currentStep += 1;
      const progress = currentStep / steps;

      const newLat = startLoc.lat + (currentLocation.lat - startLoc.lat) * progress;
      const newLng = startLoc.lng + (currentLocation.lng - startLoc.lng) * progress;
      setResponderLocation({ lat: newLat, lng: newLng });

      const R = 6371;
      const dLat = ((currentLocation.lat - newLat) * Math.PI) / 180;
      const dLng = ((currentLocation.lng - newLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((newLat * Math.PI) / 180) * Math.cos((currentLocation.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      setDistance(d.toFixed(2));
      setEta(Math.ceil(((steps - currentStep) / 60) * 2));

      if (currentStep >= steps) {
        stopResponderSimulation();
        setMessages((prev) => [...prev, { time: new Date().toLocaleTimeString(), text: 'Unit has arrived at your location.' }]);
        setEta(0);
      }
    }, 1000);
  };

  const handlePanic = async () => {
    if (!location) {
      alert('Acquiring location...');
      return;
    }

    try {
      const reporterId = getOrCreateReporterId();
      const incident = await apiFetch('/api/incidents/public', {
        method: 'POST',
        auth: false,
        body: {
          type: incidentType,
          lat: location.lat,
          lng: location.lng,
          reporter_phone: reporterId,
          description: 'Panic Button Pressed'
        }
      });

      setActiveIncident(incident.incident || incident);
      setIncidentAccessToken(incident.incident_access_token || null);
      setIsCitizenChatOpen(true);
    } catch (err) {
      console.error('Panic failed:', err);
      alert('Failed to send alert. Call 911 manually.');
    }
  };

  const statusLabel = {
    Pending: 'Waiting for Dispatcher...',
    Dispatched: 'Help is on the way!',
    Resolved: 'Incident Resolved'
  }[incidentStatus] || '';

  return (
    <div className="emergency-shell min-h-screen bg-slate-50 flex flex-col">
      {!activeIncident && (
        <Link to="/" className="fixed top-6 left-6 flex items-center gap-2 text-white hover:text-slate-200 transition-colors z-50 bg-red-700 px-4 py-2 rounded-full shadow-lg">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-bold text-sm">Home</span>
        </Link>
      )}
      <header className="bg-red-600 text-white p-4 sm:p-6 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-8 w-8" />
            <h1 className="text-2xl font-bold tracking-tight">QuickReach SOS</h1>
          </div>
          <a href="tel:911" className="bg-white text-red-600 px-4 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-slate-100 transition-colors">
            <Phone className="h-4 w-4" />
            Call 911
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-4 sm:p-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-blue-500" />
              Current Status
            </h2>
            <div className="flex items-center gap-3 mb-2">
              <div className={`h-3 w-3 rounded-full ${location ? 'bg-green-500 animate-pulse' : 'bg-orange-500 animate-bounce'}`} />
              <span className="text-sm font-medium text-slate-600">
                {location ? 'GPS Locked - Ready to Transmit' : 'Acquiring Satellite Lock...'}
              </span>
            </div>
            {location && (
              <p className="text-xs text-slate-400 font-mono">
                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
              </p>
            )}

            {activeIncident && (
              <div className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold ${
                incidentStatus === 'Resolved' ? 'bg-green-600' : incidentStatus === 'Dispatched' ? 'bg-blue-600' : 'bg-yellow-500'
              }`}>
                <div className={`h-2.5 w-2.5 rounded-full bg-white ${incidentStatus === 'Dispatched' ? 'animate-ping' : ''}`} />
                {statusLabel}
              </div>
            )}
          </div>

          {activeIncident && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700 max-h-60 overflow-y-auto">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-700 pb-2">
                Live Dispatcher Updates
              </h3>
              <div className="space-y-3">
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex gap-3 text-sm animate-in fade-in slide-in-from-left duration-500">
                    <span className="text-slate-500 font-mono text-xs whitespace-nowrap">{msg.time}</span>
                    <span className="text-slate-200">{msg.text}</span>
                  </div>
                ))}
                {messages.length === 0 && <span className="text-slate-500 italic">Connecting to dispatch...</span>}
              </div>
            </div>
          )}

          {!activeIncident && (
            <div className="grid grid-cols-2 gap-3">
              {['Medical', 'Fire'].map((type) => (
                <button
                  key={type}
                  onClick={() => setIncidentType(type)}
                  className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    incidentType === type ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}

          {!activeIncident ? (
            <button
              onClick={handlePanic}
              disabled={!location}
              className="w-full aspect-square rounded-full bg-gradient-to-br from-red-500 to-red-700 text-white shadow-2xl shadow-red-500/30 flex flex-col items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50 disabled:grayscale"
            >
              <ShieldAlert className="h-20 w-20 animate-pulse" />
              <span className="text-3xl font-black tracking-widest">SOS</span>
              <span className="text-sm font-medium opacity-80 uppercase tracking-wide">Press for Help</span>
            </button>
          ) : incidentStatus === 'Resolved' ? (
            <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center animate-in fade-in duration-500">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-800 mb-2">Incident Resolved</h3>
              <p className="text-green-600 mb-6">The dispatcher has marked this incident as closed. Stay safe!</p>
              <button className="text-slate-400 text-sm font-medium hover:text-red-500 transition-colors" onClick={resetIncidentView}>
                Close &amp; Start Over
              </button>
            </div>
          ) : (
            <div className={`rounded-2xl p-8 text-center animate-in fade-in zoom-in duration-300 border-2 ${
              incidentStatus === 'Dispatched' ? 'bg-blue-50 border-blue-500' : 'bg-yellow-50 border-yellow-400'
            }`}>
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                incidentStatus === 'Dispatched' ? 'bg-blue-100' : 'bg-yellow-100'
              }`}>
                <ShieldAlert className={`h-8 w-8 ${incidentStatus === 'Dispatched' ? 'text-blue-600' : 'text-yellow-600'}`} />
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${incidentStatus === 'Dispatched' ? 'text-blue-800' : 'text-yellow-800'}`}>
                {incidentStatus === 'Dispatched' ? 'Help is on the way!' : 'Alert Sent - Waiting for Dispatcher'}
              </h3>
              {distance && (
                <div className="my-4 p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                  <div className="text-3xl font-black text-slate-800">
                    {eta} <span className="text-sm font-medium text-slate-500">mins</span>
                  </div>
                  <div className="text-sm text-slate-500 font-bold uppercase tracking-wide">Estimated Arrival</div>
                  <div className="text-xs text-slate-400 mt-1">{distance} km away</div>
                </div>
              )}
              <p className={`mb-6 text-sm ${incidentStatus === 'Dispatched' ? 'text-blue-600' : 'text-yellow-700'}`}>
                {incidentStatus === 'Dispatched'
                  ? 'Dispatch has confirmed your location. A unit is en route.'
                  : 'Your SOS has been received. Dispatcher is reviewing your case.'}
              </p>
              <button className="text-slate-400 text-sm font-medium hover:text-red-500 transition-colors" onClick={resetIncidentView}>
                Cancel Alert (False Alarm)
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="h-[280px] sm:h-[340px] lg:h-[400px] bg-slate-200 rounded-3xl overflow-hidden shadow-inner relative">
            <IncidentMap
              userLocation={location && [location.lat, location.lng]}
              activeIncident={activeIncident}
              ambulanceLocation={responderLocation && [responderLocation.lat, responderLocation.lng]}
              className="h-full rounded-3xl border-0 shadow-none"
            />
            {!location && (
              <div className="absolute inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center">
                <span className="bg-white/90 px-4 py-2 rounded-full text-xs font-bold text-slate-500 shadow-sm">Waiting for GPS...</span>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-blue-800 text-sm">Quick Actions</h4>
              <p className="text-xs text-blue-600 leading-relaxed mt-1 mb-3">
                Stay calm. If possible, remain in your current location.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setShowSafetyTips(true)}
                  disabled={!activeIncident}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  Safety Tips
                </button>
                <button
                  onClick={() => setIsShareLocationOpen(true)}
                  disabled={!activeIncident || !location}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share Location with Contacts
                </button>
                <button
                  onClick={() => setIsCitizenChatOpen(true)}
                  disabled={!activeIncident}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Chat with Dispatch
                </button>
                <button
                  onClick={() => setShowVideoSOS(true)}
                  disabled={!activeIncident}
                  title={!activeIncident ? 'Send SOS first to start incident video room' : 'Start live video call'}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400/60 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Video className="w-4 h-4" />
                  Start Live Video Call
                </button>
                <a
                  href="/first-aid"
                  className="w-full bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Heart className="w-4 h-4" />
                  First Aid Guide
                </a>
              </div>
            </div>
          </div>

          {/* Safety Tips - Removed from here */}
        </div>
      </main>

      <EmergencyChat
        incidentId={activeIncident?.id}
        senderType="citizen"
        isOpen={isCitizenChatOpen && !!activeIncident?.id}
        onClose={() => setIsCitizenChatOpen(false)}
        requireAuth={false}
        publicIncidentToken={incidentAccessToken}
      />

      <ShareLocation
        location={location}
        incidentId={activeIncident?.id}
        isOpen={isShareLocationOpen}
        onClose={() => setIsShareLocationOpen(false)}
      />

      {showSafetyTips && activeIncident && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
              <h2 className="text-2xl font-black text-slate-900">Safety Tips</h2>
              <button onClick={() => setShowSafetyTips(false)} className="text-slate-400 hover:text-slate-600">
                <CheckCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <SafetyTips incidentType={incidentType} status={incidentStatus} />
            </div>
          </div>
        </div>
      )}

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
