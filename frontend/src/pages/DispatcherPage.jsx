import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../components/NotificationSystem';
import { IncidentMap } from '../components/IncidentMap';
import { AlertTriangle, Clock, MapPin, Phone, CheckCircle, Play, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const DispatcherPage = () => {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const { addNotification } = useNotifications();
  const audioRef = useRef(new Audio(ALERT_SOUND_URL));

  useEffect(() => {
    fetchIncidents();

    // Reset audio context if frozen
    const handleInteraction = () => {
      audioRef.current.load();
      window.removeEventListener('click', handleInteraction);
    };
    window.addEventListener('click', handleInteraction);

    console.log("📍 Initializing Real-time Subscription...");
    const channelId = `incidents_${Math.random().toString(36).substr(2, 9)}`;
    const subscription = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log("🔥 NEW INCIDENT RECEIVED:", payload);
          setIncidents(prev => [payload.new, ...prev]);
          playAlert();
          addNotification({
            type: 'error',
            title: 'NEW EMERGENCY',
            message: `Priority ${payload.new.type} alert from ${payload.new.reporter_phone || 'Unknown'}`
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          setIncidents(prev => prev.map(inc => inc.id === payload.new.id ? payload.new : inc));
        }
      )
      .subscribe((status) => {
        console.log(`📣 Subscription [${channelId}] Status:`, status);
      });

    return () => {
      console.log("🧹 Cleaning up subscription...");
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setIncidents(data);
  };

  const playAlert = () => {
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(e => console.log("Audio play failed:", e));
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', id);
    
    if (!error) {
      if (selectedIncident?.id === id) {
        setSelectedIncident(prev => ({ ...prev, status }));
      }
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
            <div className="flex items-center gap-1.5 bg-red-600/10 border border-red-600/20 px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
              <span className="text-red-500 text-[10px] font-black tracking-widest uppercase italic">Active</span>
            </div>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Emergency Dispatch Control</p>
        </header>

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
                  incident.status === 'Pending' ? "text-red-600 bg-red-600/10 animate-pulse" : "text-green-600 bg-green-600/10"
                )}>
                  {incident.status}
                </div>
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
            nearestHospital={null}
          />
          
          {/* Overlay Grid Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
          
          {/* Top Info Bar */}
          {!selectedIncident && (
            <div className="absolute top-10 left-10 z-10 animate-in fade-in slide-in-from-top duration-700">
              <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-2xl">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Satellite Status</p>
                <div className="flex items-center gap-4 text-white">
                  <div className="flex flex-col">
                    <span className="text-3xl font-black italic tracking-tighter">STANDBY</span>
                    <span className="text-[10px] opacity-40">Addis Ababa Orbital Sector 01-A</span>
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
    </div>
  );
};
