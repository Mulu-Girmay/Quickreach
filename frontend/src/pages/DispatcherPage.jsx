import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../components/NotificationSystem';
import { IncidentMap } from '../components/IncidentMap';
import { AlertTriangle, Clock, MapPin, Phone, CheckCircle, Play, Bell, MessageCircle, Languages } from 'lucide-react';
import { EmergencyChat } from '../components/EmergencyChat';
import { IVRSimulator } from '../components/IVRSimulator';
import { cn } from '../lib/utils';

const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'; // Urgent Emergency Alarm
const DISPATCH_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3'; // Professional Dispatch "Chirp"

export const DispatcherPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isIVROpen, setIsIVROpen] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showVolunteers, setShowVolunteers] = useState(true);
  const [ambulanceLocation, setAmbulanceLocation] = useState(null);
  const { addNotification } = useNotifications();
  const audioRef = useRef(new Audio(ALERT_SOUND_URL));
  const dispatchAudioRef = useRef(new Audio(DISPATCH_SOUND_URL));

  // ... (Ambulance movement remains same)
  useEffect(() => {
    if (selectedIncident?.status === 'Dispatched') {
      const hospitalCoord = [9.030, 38.740];
      const targetCoord = [selectedIncident.lat, selectedIncident.lng];
      let step = 0;
      const totalSteps = 100;
      
      const interval = setInterval(() => {
        if (step >= totalSteps) {
          clearInterval(interval);
          return;
        }
        step++;
        const currentLat = hospitalCoord[0] + (targetCoord[0] - hospitalCoord[0]) * (step / totalSteps);
        const currentLng = hospitalCoord[1] + (targetCoord[1] - hospitalCoord[1]) * (step / totalSteps);
        setAmbulanceLocation([currentLat, currentLng]);
      }, 100);

      return () => clearInterval(interval);
    } else {
      setAmbulanceLocation(null);
    }
  }, [selectedIncident?.id, selectedIncident?.status]);

  useEffect(() => {
    fetchIncidents();
    fetchHospitals();
    fetchVolunteers();

    // Reset audio context if frozen
    const handleInteraction = () => {
      audioRef.current.load();
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);

    const subscription = supabase
      .channel('dispatcher_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        fetchIncidents();
        playAlert();
        addNotification({
          type: 'error',
          title: 'NEW EMERGENCY',
          message: `Priority ${payload.new.type} alert from ${payload.new.reporter_phone || 'Unknown'}`
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, fetchIncidents)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'hospitals' }, fetchHospitals)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'volunteers' }, fetchVolunteers)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*, parent_incident_id')
      .order('triage_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    
    if (data) setIncidents(data);
  };

  const fetchHospitals = async () => {
    const { data } = await supabase.from('hospitals').select('*');
    if (data) setHospitals(data);
  };

  const fetchVolunteers = async () => {
    const { data } = await supabase.from('volunteers').select('*').eq('is_online', true);
    if (data) setVolunteers(data);
  };

  const playAlert = () => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio play failed:", e));
  };

  const playDispatch = () => {
    dispatchAudioRef.current.currentTime = 0;
    dispatchAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', id);
    
    if (!error) {
      if (status === 'Dispatched') playDispatch();
      
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => ({ ...prev, status }));
      }
      fetchIncidents();
    }
  };


  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans">
      {/* Sidebar - Incident List */}
      <aside className="w-[420px] bg-slate-900 border-r border-slate-800 flex flex-col shadow-2xl z-20">
        <header className="p-8 border-b border-slate-800 bg-slate-900">
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
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Emergency Dispatch Control</p>
        </header>

        {/* Hospital Resources Section */}
        <section className="p-4 border-b border-slate-800 bg-slate-900/50">
           <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 ml-2">Hospital Resource Status</h4>
           <div className="space-y-3">
             {hospitals.map(h => (
               <div key={h.id} className="bg-slate-800/50 p-3 rounded-2xl border border-white/5">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-xs font-bold text-slate-200">{h.name}</span>
                   <span className={cn(
                     "text-[10px] font-black",
                     h.current_capacity >= h.max_capacity ? "text-red-500" : "text-slate-400"
                   )}>
                     {h.current_capacity}/{h.max_capacity}
                   </span>
                 </div>
                 <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                   <div 
                     className={cn(
                       "h-full transition-all duration-500",
                       h.current_capacity >= h.max_capacity ? "bg-red-600" : "bg-blue-500"
                     )}
                     style={{ width: `${Math.min(100, (h.current_capacity / h.max_capacity) * 100)}%` }}
                   />
                 </div>
               </div>
             ))}
           </div>
        </section>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {incidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-40 opacity-20">
              <Clock className="w-16 h-16 text-slate-400 mb-4" />
              <p className="font-black uppercase tracking-widest text-xs text-slate-400 text-center">Awaiting Incoming Signal...</p>
            </div>
          )}
          
          {incidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className={cn(
                "p-5 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer group",
                selectedIncident?.id === incident.id 
                  ? "bg-white border-white text-slate-900 shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-[0.98]" 
                  : "bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800",
                incident.status === 'Pending' && selectedIncident?.id !== incident.id && "border-red-600/30 bg-red-600/5"
              )}
            >
              <div className="flex justify-between items-center mb-3">
                <span className={cn(
                  "text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                  incident.type === 'Fire' 
                    ? "bg-orange-500/10 border-orange-500/20 text-orange-500" 
                    : "bg-blue-500/10 border-blue-500/20 text-blue-500",
                  selectedIncident?.id === incident.id && "bg-slate-900 text-white border-slate-900"
                )}>
                  {incident.type}
                </span>
                <span className="text-[10px] font-bold opacity-60 flex items-center gap-1">
                   <Clock className="w-3 h-3" />
                   {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              
              {/* AI Triage Score */}
              <div className="flex items-center gap-2 mb-2">
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                  (incident.triage_score || 5) >= 8 ? "bg-red-500 text-white shadow-lg shadow-red-900/20" : "bg-slate-700 text-slate-300"
                )}>
                  AI TRIAGE: {incident.triage_score || 5}/10
                </div>
                {(incident.triage_score || 5) >= 8 && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />}
              </div>
              
              <div className="mb-4">
                <h3 className={cn(
                  "text-lg font-black tracking-tight",
                  selectedIncident?.id === incident.id ? "text-slate-900" : "text-slate-200"
                )}>
                  {incident.reporter_phone}
                </h3>
                <div className="flex items-center gap-1 opacity-50 text-[10px] font-bold uppercase tracking-widest">
                  <MapPin className="w-3 h-3 text-red-600" />
                  <span>Sub-City Sector: {incident.sub_city || 'Central Addis'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter",
                  incident.status === 'Pending' ? "text-red-600 bg-red-600/10 animate-pulse" : 
                  incident.status === 'Collapsed' ? "text-slate-500 bg-slate-800 border border-slate-700" :
                  "text-green-600 bg-green-600/10"
                )}>
                  {incident.status}
                </div>
                {incident.parent_incident_id && (
                  <span className="text-[10px] font-bold text-slate-500 italic">Linked to Active Group</span>
                )}
                <div className="flex gap-2">
                   {incident.status === 'Pending' && (
                     <button 
                      onClick={(e) => { e.stopPropagation(); updateStatus(incident.id, 'Dispatched'); }}
                      className="bg-slate-900 text-white text-[10px] font-black px-4 py-2 rounded-xl hover:bg-red-600 transition-colors shadow-lg"
                    >
                      ACTIVATE
                    </button>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Command Monitor */}
      <main className="flex-1 relative flex flex-col">
        <div className="flex-1 bg-slate-950 relative">
          <IncidentMap 
            userLocation={selectedIncident ? [selectedIncident.lat, selectedIncident.lng] : null}
            ambulanceLocation={ambulanceLocation}
            allIncidents={incidents}
            showHeatmap={showHeatmap}
            volunteers={volunteers}
            showVolunteers={showVolunteers}
            nearestHospital={null}
          />

          {/* Map Layer Toggles */}
          <div className="absolute top-10 right-10 z-10 flex flex-col gap-2 scale-90 origin-top-right">
            <button 
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-2xl backdrop-blur-md w-48 text-left flex justify-between items-center group",
                showHeatmap ? "bg-orange-600 text-white border-orange-400" : "bg-slate-900/80 text-slate-400 border-white/5"
              )}
            >
              <span>Density Heatmap</span>
              <div className={cn("w-1.5 h-1.5 rounded-full", showHeatmap ? "bg-white animate-pulse" : "bg-slate-700")} />
            </button>

            <button 
              onClick={() => setShowVolunteers(!showVolunteers)}
              className={cn(
                "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-2xl backdrop-blur-md w-48 text-left flex justify-between items-center",
                showVolunteers ? "bg-blue-600 text-white border-blue-400" : "bg-slate-900/80 text-slate-400 border-white/5"
              )}
            >
              <span>Volunteer Network</span>
              <div className={cn("w-1.5 h-1.5 rounded-full", showVolunteers ? "bg-white animate-pulse" : "bg-slate-700")} />
            </button>
          </div>

          <EmergencyChat 
            incidentId={selectedIncident?.id} 
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
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-1">Fleet Telemetry</p>
                    <div className="flex items-center gap-1.5">
                       <span className="text-2xl font-black italic tracking-tighter text-white">READY</span>
                       <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mb-1">Signal Mode</p>
                    <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Satellite Mesh</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-slate-500 uppercase tracking-widest">Network Load</span>
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
          <div className="p-8 pb-12 bg-slate-900 border-t border-slate-800 z-30 animate-in slide-in-from-bottom duration-500">
            <div className="max-w-6xl mx-auto flex items-stretch gap-10">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-red-600 w-2 h-10 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.5)]"></div>
                  <div>
                    <h2 className="text-3xl font-black text-white italic tracking-tight uppercase">Emergency Profile</h2>
                    <p className="text-slate-500 text-[10px] font-bold tracking-[0.2em]">Live Telemetry & Geodata</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Incident ID', val: `#${selectedIncident.id.slice(0,8)}`, color: 'text-white' },
                    { label: 'Priority', val: 'CRITICAL', color: 'text-red-500' },
                    { label: 'Status', val: selectedIncident.status, color: 'text-green-500' },
                    { label: 'Telemetry', val: `${selectedIncident.lat.toFixed(6)}, ${selectedIncident.lng.toFixed(6)}`, color: 'text-slate-400 text-xs' }
                  ].map((stat, i) => (
                    <div key={i} className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                      <p className={cn("font-black tracking-tighter", stat.color)}>{stat.val}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-px bg-slate-800"></div>
              
              <div className="w-80 flex flex-col justify-center gap-4">
                 <button 
                  className="w-full bg-white text-slate-900 py-4 rounded-3xl font-black flex items-center justify-center gap-3 hover:bg-slate-200 transition-all group"
                  onClick={() => window.open(`tel:${selectedIncident.reporter_phone}`)}
                 >
                   <Phone className="w-5 h-5 fill-slate-900 group-hover:scale-110 transition-transform" />
                   ESTABLISH LINK
                 </button>

                 <button 
                  className="w-full bg-blue-600/20 text-blue-400 py-4 rounded-3xl font-black flex items-center justify-center gap-3 border border-blue-500/20 hover:bg-blue-600/30 transition-all font-sans"
                  onClick={() => setIsChatOpen(true)}
                 >
                   <MessageCircle className="w-5 h-5" />
                   OPEN INCIDENT CHAT
                 </button>
                 
                 <div className="grid grid-cols-2 gap-3">
                   <button 
                     className="bg-red-600 text-white py-3 rounded-2xl font-black text-xs hover:bg-red-700 transition-all"
                     onClick={() => updateStatus(selectedIncident.id, 'Dispatched')}
                   >
                     DISPATCH
                   </button>
                   <button 
                     className="bg-slate-800 text-white py-3 rounded-2xl font-black text-xs hover:bg-slate-700 border border-white/5 italic"
                     onClick={() => updateStatus(selectedIncident.id, 'Resolved')}
                   >
                     RESOLVE
                   </button>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <IVRSimulator 
        isOpen={isIVROpen} 
        onClose={() => setIsIVROpen(false)} 
      />
    </div>
  );
};
