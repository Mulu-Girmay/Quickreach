import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
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
  const audioRef = useRef(new Audio(ALERT_SOUND_URL));

  useEffect(() => {
    // Initial fetch
    fetchIncidents();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('incidents_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incidents' },
        (payload) => {
          console.log('New Incident!', payload);
          setIncidents(prev => [payload.new, ...prev]);
          playAlert();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incidents' },
        (payload) => {
          setIncidents(prev => prev.map(inc => inc.id === payload.new.id ? payload.new : inc));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchIncidents = async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setIncidents(data);
  };

  const playAlert = () => {
    audioRef.current.play().catch(e => console.log("Audio play failed (browser restriction):", e));
  };

  const updateStatus = async (id, status) => {
    const { error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', id);
    
    if (error) console.error("Update error:", error);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar - Incident List */}
      <aside className="w-96 bg-white border-r border-slate-200 flex flex-col shadow-xl z-10">
        <header className="p-6 border-b border-slate-100 bg-slate-900 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-black flex items-center gap-2">
              <Bell className="text-red-500 w-5 h-5 fill-red-500" />
              Dispatcher HQ
            </h1>
            <span className="bg-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
          </div>
          <p className="text-slate-400 text-xs">Real-time Emergency Feed</p>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {incidents.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Waiting for incoming alerts...</p>
            </div>
          )}
          
          {incidents.map((incident) => (
            <div
              key={incident.id}
              onClick={() => setSelectedIncident(incident)}
              className={cn(
                "p-4 rounded-xl border transition-all cursor-pointer",
                selectedIncident?.id === incident.id 
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                  : "bg-white border-slate-100 hover:border-slate-300 shadow-sm",
                incident.status === 'Pending' && "border-l-4 border-l-red-600"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                  incident.type === 'Fire' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700",
                  selectedIncident?.id === incident.id && "bg-white/10 text-white"
                )}>
                  {incident.type}
                </span>
                <span className="text-[10px] opacity-60">
                   {new Date(incident.created_at).toLocaleTimeString()}
                </span>
              </div>
              
              <h3 className="font-bold text-sm mb-1">{incident.reporter_phone}</h3>
              <div className="flex items-center gap-1 opacity-60 text-xs">
                <MapPin className="w-3 h-3" />
                <span>Addis Ababa, ET</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); updateStatus(incident.id, 'Dispatched'); }}
                  className="bg-green-600 hover:bg-green-50 text-white hover:text-green-600 text-[10px] font-bold px-3 py-1 rounded border border-green-600 transition-colors"
                >
                  Dispatch
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); updateStatus(incident.id, 'Resolved'); }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold px-3 py-1 rounded transition-colors"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main Map View */}
      <main className="flex-1 relative">
        <IncidentMap 
          userLocation={selectedIncident ? [selectedIncident.lat, selectedIncident.lng] : null}
          nearestHospital={null}
        />
        
        {selectedIncident && (
          <div className="absolute bottom-6 left-6 right-6 bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 flex gap-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-red-600 w-6 h-6" />
                <h2 className="text-xl font-black text-slate-900">Incident Details</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Reporter</p>
                  <p className="font-bold text-slate-800">{selectedIncident.reporter_phone}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Type</p>
                  <p className="font-bold text-slate-800 uppercase">{selectedIncident.type}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Coordinates</p>
                  <p className="font-bold text-slate-800 text-xs">{selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Priority</p>
                  <p className="font-bold text-red-600 uppercase">HIGH</p>
                </div>
              </div>
            </div>
            
            <div className="w-px bg-slate-100"></div>
            
            <div className="w-1/3 flex flex-col justify-center gap-3">
               <button 
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                onClick={() => window.open(`tel:${selectedIncident.reporter_phone}`)}
               >
                 <Phone className="w-5 h-5" />
                 Open Call Comm
               </button>
               <button 
                 className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 shadow-lg active:scale-95 transition-all"
                 onClick={() => updateStatus(selectedIncident.id, 'Dispatched')}
               >
                 <Play className="w-5 h-5 text-green-400" />
                 Confirm Dispatch
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
