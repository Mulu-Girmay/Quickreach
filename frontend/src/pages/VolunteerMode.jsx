import React, { useState, useEffect } from 'react';
import { UserCheck, MapPin, Bell, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const VolunteerMode = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);

  useEffect(() => {
    const syncStatus = async () => {
      await supabase
        .from('volunteers')
        .update({ is_online: isOnline, last_active: new Date().toISOString() })
        .eq('phone', '0911223344');
    };
    
    syncStatus();

    if (isOnline) {
      // Subscribe to real-time incident updates
      const channel = supabase
        .channel('volunteer-alerts')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, payload => {
          setNearbyIncidents(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-blue-500" />
          <h1 className="text-2xl font-bold tracking-tight">QuickReach <span className="text-blue-500 font-medium text-lg">Volunteer</span></h1>
        </div>
        <div className="flex items-center gap-3 bg-slate-800 p-1.5 rounded-full border border-white/5">
           <span className={`text-xs font-bold px-3 py-1 rounded-full ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
             {isOnline ? 'ONLINE' : 'OFFLINE'}
           </span>
           <button 
             onClick={() => setIsOnline(!isOnline)}
             className={`w-12 h-6 rounded-full relative transition-colors ${isOnline ? 'bg-blue-600' : 'bg-slate-600'}`}
           >
             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isOnline ? 'right-1' : 'left-1'}`} />
           </button>
        </div>
      </header>

      <main>
        {!isOnline ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-6">
               <UserCheck className="w-10 h-10 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Ready to help?</h2>
            <p className="text-slate-400 max-w-xs">Switch to Online mode to receive alerts for nearby emergencies requiring first aid.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-bold">Nearby Alerts</h2>
            </div>
            
            {nearbyIncidents.length === 0 ? (
              <div className="bg-slate-800/30 border border-white/5 rounded-3xl p-10 text-center">
                <p className="text-slate-500">Scanning for incidents in your radius...</p>
              </div>
            ) : (
              nearbyIncidents.map(incident => (
                <div key={incident.id} className="bg-slate-800 border border-blue-500/30 rounded-3xl p-6 shadow-xl animate-pulse">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold text-blue-400 uppercase tracking-widest bg-blue-400/10 px-2 py-1 rounded mb-2 inline-block">
                        Active Incident
                      </span>
                      <h3 className="text-xl font-bold">{incident.type} Intervention</h3>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 text-sm">
                      <MapPin className="w-4 h-4" />
                      0.8km away
                    </div>
                  </div>
                  <p className="text-slate-300 mb-6 text-sm">Emergency reported via USSD. First Responder assistance requested for immediate aid.</p>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-colors">
                    Accept & View Location
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
