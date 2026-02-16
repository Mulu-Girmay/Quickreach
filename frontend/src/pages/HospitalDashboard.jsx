import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Activity, Users, Thermometer, Radio, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export const HospitalDashboard = () => {
  const [status, setStatus] = useState({
    beds: 12,
    oxygen: 'Normal',
    icuRooms: 3,
    isOverloaded: false
  });

  const toggleOverload = () => {
    setStatus(prev => ({ ...prev, isOverloaded: !prev.isOverloaded }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 font-sans">
      <header className="max-w-4xl mx-auto mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl">
              <Shield className="w-5 h-5 fill-white" />
            </div>
            HOSPITAL <span className="text-blue-500">RESOURCE GATEWAY</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">St. Paul's Specialized Hospital - Command Node</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-2xl border border-white/5">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Linked to QuickReach HQ</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Resource Cards */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Users className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Critical Capacity</p>
            <div className="flex items-end gap-3 mb-2">
              <span className="text-6xl font-black tracking-tighter">{status.beds}</span>
              <span className="text-xl font-bold text-slate-500 mb-2 uppercase">Beds Open</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-2/3 shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
               <Thermometer className="w-5 h-5 text-blue-400 mb-3" />
               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Oxygen Supply</p>
               <p className="font-black text-white">{status.oxygen}</p>
             </div>
             <div className="bg-slate-900/50 p-6 rounded-3xl border border-white/5">
               <Activity className="w-5 h-5 text-purple-400 mb-3" />
               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">ICU Status</p>
               <p className="font-black text-white">{status.icuRooms} Available</p>
             </div>
          </div>
        </div>

        {/* Status Control */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                "w-3 h-3 rounded-full shadow-[0_0_15px]",
                status.isOverloaded ? "bg-red-500 shadow-red-500" : "bg-green-500 shadow-green-500"
              )} />
              <h2 className="text-xl font-black uppercase tracking-tight italic">Mission Readiness</h2>
            </div>
            <p className="text-slate-400 text-xs font-medium leading-relaxed mb-8">
              {status.isOverloaded 
                ? "WARNING: Resources are currently at 100% capacity. New emergency rerouting is recommended."
                : "Operational status is optimal. Ready to receive high-acuity incidents via QuickReach Dispatch."}
            </p>
          </div>

          <button 
            onClick={toggleOverload}
            className={cn(
              "w-full py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3",
              status.isOverloaded 
                ? "bg-red-600 text-white shadow-xl shadow-red-900/40 hover:bg-red-700" 
                : "bg-white text-slate-900 shadow-xl hover:bg-slate-200"
            )}
          >
            {status.isOverloaded ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {status.isOverloaded ? "SYSTEM OVERLOADED (STOP INTAKE)" : "SET TO FULL CAPACITY"}
          </button>
        </div>
      </main>

      <footer className="max-w-4xl mx-auto mt-20 text-center text-slate-600 text-[10px] font-bold uppercase tracking-[0.5em]">
        <Radio className="w-4 h-4 mx-auto mb-2 opacity-20 animate-pulse" />
        Satellite Encrypted Link: Paul's-Specialized-HQ-A1
      </footer>
    </div>
  );
};
