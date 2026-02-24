import React, { useEffect, useState } from 'react';
import { BarChart3, Activity, ShieldCheck, Layers } from 'lucide-react';
import { apiFetch } from '../lib/api';

export function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const payload = await apiFetch('/api/analytics/overview');
      setData(payload);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const metrics = data?.metrics || {};
  const hospitalLoad = data?.hospital_load || [];
  const accountability = data?.operator_accountability || {};

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-black mb-2 flex items-center gap-2">
          <BarChart3 className="w-7 h-7 text-blue-500" />
          Response Analytics
        </h1>
        <p className="text-slate-500 text-sm mb-8">Live competition-grade operations dashboard</p>
        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card icon={<Activity className="w-5 h-5" />} label="Total Incidents" value={metrics.total_incidents ?? 0} />
          <Card icon={<ShieldCheck className="w-5 h-5" />} label="Dispatch Success" value={`${metrics.dispatch_success_pct ?? 0}%`} />
          <Card icon={<Layers className="w-5 h-5" />} label="Collapse Rate" value={`${metrics.collapse_rate_pct ?? 0}%`} />
          <Card icon={<BarChart3 className="w-5 h-5" />} label="Avg Priority" value={metrics.average_priority ?? 0} />
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 rounded-3xl p-6 border border-white/5">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Hospital Load</h2>
            {hospitalLoad.map((h) => (
              <div key={h.name} className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span>{h.name}</span>
                  <span>{h.load_pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, h.load_pct)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-3xl p-6 border border-white/5">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Operator Accountability</h2>
            {Object.keys(accountability).length === 0 ? (
              <p className="text-slate-500 text-sm">No operator actions yet.</p>
            ) : (
              Object.entries(accountability).map(([id, count]) => (
                <div key={id} className="flex justify-between text-sm border-b border-white/5 py-2">
                  <span className="truncate max-w-[70%]">{id}</span>
                  <span className="font-black">{count}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({ icon, label, value }) {
  return (
    <div className="bg-slate-900 rounded-3xl p-5 border border-white/5">
      <div className="text-slate-400 mb-2">{icon}</div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-black">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

