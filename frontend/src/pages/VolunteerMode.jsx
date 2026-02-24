import React, { useState, useEffect } from 'react';
import { UserCheck, MapPin, Bell, Shield, CheckCircle, X, Navigation, MessageCircle, AlertTriangle, Clock, TrendingUp, User, Settings } from 'lucide-react';
import { IncidentMap } from '../components/IncidentMap';
import { EmergencyChat } from '../components/EmergencyChat';
import { VolunteerProfile } from '../components/VolunteerProfile';
import { EmergencySOS } from '../components/EmergencySOS';
import { IncidentDetails } from '../components/IncidentDetails';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

export const VolunteerMode = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [profile, setProfile] = useState(null);
  const [location, setLocation] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [acceptedIncidentIds, setAcceptedIncidentIds] = useState([]);
  const [resolvedNotifications, setResolvedNotifications] = useState([]);
  const [responseHistory, setResponseHistory] = useState(() => {
    const saved = localStorage.getItem('volunteer_response_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [incidentTimers, setIncidentTimers] = useState({});
  const [unrespondedHistory, setUnrespondedHistory] = useState(() => {
    const saved = localStorage.getItem('volunteer_unresponded_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [showUnrespondedHistory, setShowUnrespondedHistory] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedIncidentDetails, setSelectedIncidentDetails] = useState(null);

  const mergeUnrespondedHistory = (prev, incoming) => {
    const seen = new Set();
    return [...incoming, ...prev].filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  };

  const clearIncidentTimer = (incidentId) => {
    setIncidentTimers((prev) => {
      if (!prev[incidentId]) return prev;
      clearTimeout(prev[incidentId]);
      const next = { ...prev };
      delete next[incidentId];
      return next;
    });
  };

  // Persist histories to localStorage
  useEffect(() => {
    localStorage.setItem('volunteer_response_history', JSON.stringify(responseHistory));
  }, [responseHistory]);

  useEffect(() => {
    localStorage.setItem('volunteer_unresponded_history', JSON.stringify(unrespondedHistory));
  }, [unrespondedHistory]);

  const loadProfile = async () => {
    try {
      const payload = await apiFetch('/api/volunteers/me', { auth: true });
      setProfile(payload.volunteer || null);
      if (payload.volunteer) setIsOnline(!!payload.volunteer.is_online);
    } catch (error) {
      console.error('Volunteer profile load failed:', error.message);
      // Create default profile if doesn't exist
      setProfile({ name: 'Volunteer', phone: 'N/A' });
    }
  };

  const fetchNearbyIncidents = async () => {
    try {
      const payload = await apiFetch('/api/incidents', { auth: false });
      const allPending = (payload.incidents || []).filter(i => i.status === 'Pending');
      
      const now = new Date();
      const recentIncidents = [];
      const oldIncidents = [];
      
      allPending.forEach(inc => {
        const createdAt = new Date(inc.created_at);
        const ageMinutes = (now - createdAt) / 1000 / 60;
        
        // If incident is older than 2 minutes, it's expired
        if (ageMinutes > 2) {
          oldIncidents.push({ ...inc, expiredAt: inc.created_at });
        } else {
          recentIncidents.push(inc);
        }
      });
      
      // Add old incidents to unresponded history
      if (oldIncidents.length > 0) {
        setUnrespondedHistory(prev => mergeUnrespondedHistory(prev, oldIncidents));
      }
      
      if (location) {
        // Calculate distances and filter recent incidents only
        const withDist = recentIncidents.map(inc => {
           const d = calculateDistance(location.lat, location.lng, inc.lat, inc.lng);
           return { ...inc, distance: d };
        }).filter(inc => inc.distance <= 10) // 10km radius
          .sort((a, b) => a.distance - b.distance);
        
        setNearbyIncidents(withDist);
        
        // Start timers for new incidents
        withDist.forEach(inc => {
          if (!acceptedIncidentIds.includes(inc.id)) {
            startIncidentTimer(inc);
          }
        });
      } else {
        setNearbyIncidents(recentIncidents);
      }
    } catch (error) {
      console.error('Fetch incidents failed:', error.message);
    }
  };

  const startIncidentTimer = (incident) => {
    setIncidentTimers(prev => {
      if (prev[incident.id]) return prev;

      const timerId = setTimeout(() => {
        // Move directly to history after 2 minutes
        const expiredIncident = { ...incident, expiredAt: new Date().toISOString() };
        setUnrespondedHistory(current => mergeUnrespondedHistory(current, [expiredIncident]));
        setNearbyIncidents(current => current.filter(i => i.id !== incident.id));
        setIncidentTimers(current => {
          const updated = { ...current };
          delete updated[incident.id];
          return updated;
        });
      }, 120000); // 2 minutes

      return { ...prev, [incident.id]: timerId };
    });
  };

  const handleAcceptIncident = async (incident) => {
    try {
      await apiFetch(`/api/incidents/${incident.id}/volunteer-accept`, { method: 'POST', auth: true });
      setAcceptedIncidentIds((prev) => (prev.includes(incident.id) ? prev : [...prev, incident.id]));
      setSelectedIncident(incident);
      // Clear timer
      clearIncidentTimer(incident.id);
      // Add to history
      setResponseHistory(prev => [{
        id: incident.id,
        type: incident.type,
        acceptedAt: new Date().toISOString(),
        status: 'Active'
      }, ...prev]);
    } catch (error) {
      console.error('Volunteer accept failed:', error.message);
      alert(error.message || 'Could not accept incident.');
    }
  };

  const sendStatusUpdate = async (status, message) => {
    if (!selectedIncident) return;
    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        body: {
          incident_id: selectedIncident.id,
          sender: 'volunteer',
          message: `Volunteer update: ${message}`
        },
        auth: false
      });
      alert(`Status updated: ${status}`);
    } catch (error) {
      console.error('Status update failed:', error.message);
      alert('Failed to send status update');
    }
  };

  const openNavigation = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  // Haversine Formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    loadProfile();
    // Watch Location
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  useEffect(() => {
    if (!profile) return;
    const syncStatus = async () => {
      try {
        await apiFetch('/api/volunteers/me/status', {
          method: 'PATCH',
          body: { is_online: isOnline },
          auth: true
        });
      } catch (error) {
        console.error('Volunteer status sync failed:', error.message);
      }
    };
    syncStatus();
  }, [isOnline, profile]);

  useEffect(() => {
    if (!isOnline) return;
    fetchNearbyIncidents();
  }, [isOnline, location]);

  useEffect(() => {
    if (isOnline) {
      const channel = supabase
        .channel('volunteer-alerts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, () => {
          fetchNearbyIncidents();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, payload => {
          if (selectedIncident?.id === payload.new.id) {
            setSelectedIncident(prev => prev ? { ...prev, ...payload.new } : prev);
          }

          if (selectedIncidentDetails?.id === payload.new.id) {
            setSelectedIncidentDetails(prev => prev ? { ...prev, ...payload.new } : prev);
          }

          // Check if accepted incident was resolved
          if (payload.new.status === 'Resolved' && acceptedIncidentIds.includes(payload.new.id)) {
            setResolvedNotifications(prev => [...prev, {
              id: payload.new.id,
              type: payload.new.type,
              time: new Date().toLocaleTimeString()
            }]);
            setAcceptedIncidentIds(prev => prev.filter(id => id !== payload.new.id));
            if (selectedIncident?.id === payload.new.id) {
              setSelectedIncident(null);
            }
            // Update history
            setResponseHistory(prev => prev.map(h => 
              h.id === payload.new.id ? { ...h, status: 'Resolved', resolvedAt: new Date().toISOString() } : h
            ));
          }
          
          // If incident status changed from Pending, clear its timer and remove from unresponded tracking
          if (payload.new.status !== 'Pending') {
            clearIncidentTimer(payload.new.id);
          }
          
          fetchNearbyIncidents();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOnline, acceptedIncidentIds, selectedIncident, selectedIncidentDetails, incidentTimers]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white font-sans">
      {/* Resolved Notifications */}
      <div className="fixed top-4 right-3 sm:right-4 z-50 space-y-2 max-w-[calc(100vw-1.5rem)] sm:max-w-sm">
        {resolvedNotifications.map((notif) => (
          <div
            key={notif.id}
            className="bg-green-600 border border-green-500 rounded-xl p-4 shadow-2xl animate-in slide-in-from-right"
          >
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-sm">Incident Resolved</p>
                <p className="text-xs text-green-100 mt-1">
                  {notif.type} emergency has been resolved by dispatcher at {notif.time}
                </p>
              </div>
              <button
                onClick={() => setResolvedNotifications(prev => prev.filter(n => n.id !== notif.id))}
                className="text-white hover:text-green-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="w-full sm:w-auto">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white bg-slate-800 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Home
            </Link>
          </div>
          <div className="flex w-full sm:w-auto flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                QuickReach <span className="text-blue-400">Volunteer</span>
              </h1>
              {profile?.name && (
                <p className="text-sm text-slate-400 mt-0.5">Welcome, {profile.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Profile Button */}
            <button
              onClick={() => setIsProfileOpen(true)}
              className="bg-slate-800/50 backdrop-blur-sm p-2 rounded-xl border border-white/10 hover:bg-slate-700 transition-all"
              title="Profile Settings"
            >
              <Settings className="w-5 h-5 text-slate-400" />
            </button>
            {/* Response Stats */}
            <div className="bg-slate-800/50 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-sm font-bold text-white">{responseHistory.length}</span>
                <span className="text-xs text-slate-400">Responses</span>
              </div>
            </div>
            {/* Online Toggle */}
            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-white/10">
              <span className={cn(
                "text-[10px] sm:text-xs font-bold px-3 sm:px-4 py-2 rounded-xl transition-all",
                isOnline ? 'bg-green-500 text-white' : 'bg-slate-700 text-slate-300'
              )}>
                {isOnline ? '● ONLINE' : '○ OFFLINE'}
              </span>
              <button 
                onClick={() => setIsOnline(!isOnline)}
                className={cn(
                  "w-14 h-7 rounded-full relative transition-all duration-300",
                  isOnline ? 'bg-blue-600' : 'bg-slate-600'
                )}
              >
                <div className={cn(
                  "absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 shadow-lg",
                  isOnline ? 'right-1' : 'left-1'
                )} />
              </button>
            </div>
          </div>
        </header>

        <main>
          {!isOnline ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                <UserCheck className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-3">Ready to Save Lives?</h2>
              <p className="text-slate-400 max-w-md text-lg">Switch to Online mode to receive alerts for nearby emergencies requiring first aid assistance.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Map View */}
              {selectedIncident && (
                <div className="animate-in slide-in-from-top space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      <MapPin className="text-red-500" />
                      En Route to Incident
                    </h2>
                    <button 
                      onClick={() => setSelectedIncident(null)}
                      className="text-sm text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-all"
                    >
                      Close
                    </button>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Actions</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => openNavigation(selectedIncident.lat, selectedIncident.lng)}
                        className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-blue-500/50 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <div className="relative flex flex-col items-center gap-2">
                          <Navigation className="w-5 h-5" />
                          <span className="text-sm">Navigate</span>
                        </div>
                      </button>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="group relative overflow-hidden bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-green-500/50 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <div className="relative flex flex-col items-center gap-2">
                          <MessageCircle className="w-5 h-5" />
                          <span className="text-sm">Chat</span>
                        </div>
                      </button>
                      <button
                        onClick={() => sendStatusUpdate('Arrived', 'I have arrived at the scene')}
                        className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-emerald-500/50 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <div className="relative flex flex-col items-center gap-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm">Arrived</span>
                        </div>
                      </button>
                      <button
                        onClick={() => sendStatusUpdate('Need Backup', 'Requesting additional assistance')}
                        className="group relative overflow-hidden bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-orange-500/50 hover:scale-105"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                        <div className="relative flex flex-col items-center gap-2">
                          <AlertTriangle className="w-5 h-5" />
                          <span className="text-sm">Backup</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="h-80 rounded-3xl overflow-hidden border-2 border-blue-500/30 bg-slate-800 shadow-2xl">
                    <IncidentMap 
                      userLocation={location && [location.lat, location.lng]}
                      activeIncident={selectedIncident}
                      showHeatmap={false}
                      className="h-full rounded-3xl border-0"
                    />
                  </div>
                </div>
              )}

              {/* Incidents List */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="w-6 h-6 text-blue-400" />
                  <h2 className="text-2xl font-black">Nearby Emergencies</h2>
                  <span className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full">
                    {nearbyIncidents.length}
                  </span>
                </div>
                
                {nearbyIncidents.length === 0 ? (
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-3xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bell className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-lg">Scanning for incidents in your area...</p>
                    {!location && <p className="text-xs text-orange-400 mt-2">⚠ Waiting for GPS signal...</p>}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {nearbyIncidents.map(incident => (
                      <div 
                        key={incident.id} 
                        className={cn(
                          "bg-gradient-to-br from-slate-800 to-slate-900 border-2 rounded-3xl p-6 shadow-xl transition-all hover:scale-[1.02] cursor-pointer",
                          acceptedIncidentIds.includes(incident.id) 
                            ? "border-green-500/50 bg-green-900/20" 
                            : "border-red-500/30 animate-pulse"
                        )}
                        onClick={() => setSelectedIncidentDetails(incident)}
                      >
                        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-black text-red-400 uppercase tracking-widest bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/30">
                                {incident.status}
                              </span>
                              {acceptedIncidentIds.includes(incident.id) && (
                                <span className="text-xs font-black text-green-400 uppercase tracking-widest bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/30">
                                  ✓ ACCEPTED
                                </span>
                              )}
                            </div>
                            <h3 className="text-2xl font-black mb-1">{incident.type} Emergency</h3>
                            <p className="text-sm text-slate-400">{new Date(incident.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2 text-slate-300 self-start sm:self-center">
                            <MapPin className="w-5 h-5 text-red-500" />
                            <span className="text-lg sm:text-xl font-bold">
                              {incident.distance ? `${incident.distance.toFixed(1)} km` : '...'}
                            </span>
                          </div>
                        </div>
                        <p className="text-slate-300 mb-6">Emergency assistance required. First responder needed for immediate aid at incident location.</p>
                        <button 
                          onClick={() => handleAcceptIncident(incident)}
                          className={cn(
                            "w-full font-bold py-4 rounded-2xl transition-all text-lg",
                            acceptedIncidentIds.includes(incident.id)
                              ? "bg-green-600 hover:bg-green-500 text-white"
                              : "bg-blue-600 hover:bg-blue-500 text-white"
                          )}
                          disabled={acceptedIncidentIds.includes(incident.id) && selectedIncident?.id === incident.id}
                        >
                          {acceptedIncidentIds.includes(incident.id) ? '✓ View Location on Map' : 'Accept & Respond'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Unresponded History */}
              {unrespondedHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                      <h2 className="text-2xl font-black">Unresponded History</h2>
                      <span className="bg-orange-600/50 text-white text-sm font-bold px-3 py-1 rounded-full">
                        {unrespondedHistory.length}
                      </span>
                    </div>
                    <button
                      onClick={() => setShowUnrespondedHistory(!showUnrespondedHistory)}
                      className="text-sm text-orange-400 hover:text-orange-300 font-bold"
                    >
                      {showUnrespondedHistory ? 'Hide' : 'Show All'}
                    </button>
                  </div>
                  
                  {showUnrespondedHistory && (
                    <div className="grid gap-3">
                      {unrespondedHistory.map((incident, idx) => (
                        <div
                          key={`unresponded-${incident.id}-${idx}`}
                          className="bg-slate-800/30 border border-orange-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            <div>
                              <p className="font-bold text-white">{incident.type} Emergency</p>
                              <p className="text-xs text-slate-400">
                                Created: {new Date(incident.created_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-orange-400">
                                Expired: {new Date(incident.expiredAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-bold px-3 py-1 rounded-lg bg-orange-500/20 text-orange-400">
                            Missed
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Response History */}
              {responseHistory.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-slate-400" />
                      <h2 className="text-2xl font-black">Response History</h2>
                    </div>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-sm text-blue-400 hover:text-blue-300 font-bold"
                    >
                      {showHistory ? 'Hide' : 'Show All'}
                    </button>
                  </div>
                  
                  {showHistory && (
                    <div className="grid gap-3">
                      {responseHistory.map((response, idx) => (
                        <div
                          key={`${response.id}-${idx}`}
                          className="bg-slate-800/50 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            {response.status === 'Resolved' ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-blue-500" />
                            )}
                            <div>
                              <p className="font-bold text-white">{response.type} Emergency</p>
                              <p className="text-xs text-slate-400">
                                Accepted: {new Date(response.acceptedAt).toLocaleString()}
                              </p>
                              {response.resolvedAt && (
                                <p className="text-xs text-green-400">
                                  Resolved: {new Date(response.resolvedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={cn(
                            "text-xs font-bold px-3 py-1 rounded-lg",
                            response.status === 'Resolved' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-blue-500/20 text-blue-400'
                          )}>
                            {response.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>

        {/* Emergency Chat */}
        <EmergencyChat
          incidentId={selectedIncident?.id}
          senderType="volunteer"
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />

        {/* Profile Modal */}
        <VolunteerProfile
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          profile={profile}
          onUpdate={(updated) => setProfile({ ...profile, ...updated })}
        />

        {/* Emergency SOS */}
        <EmergencySOS
          volunteerId={profile?.phone}
          onSOSTriggered={() => alert('Emergency SOS sent successfully!')}
        />

        {/* Incident Details Modal */}
        <IncidentDetails
          incident={selectedIncidentDetails}
          isOpen={!!selectedIncidentDetails}
          onClose={() => setSelectedIncidentDetails(null)}
          onNavigate={openNavigation}
          onAccept={(inc) => {
            handleAcceptIncident(inc);
            setSelectedIncidentDetails(null);
          }}
        />
      </div>
    </div>
  );
};
