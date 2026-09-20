import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, Hospital, Users, Clock, BarChart3 } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";

export function DispatcherDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ incidents: [], volunteers: [], hospitals: [] });

  useEffect(() => {
    Promise.all([
      apiFetch("/api/incidents"),
      apiFetch("/api/volunteers/online"),
      apiFetch("/api/hospitals"),
    ])
      .then(([incidents, volunteers, hospitals]) =>
        setData({
          incidents: incidents.incidents || [],
          volunteers: volunteers.volunteers || [],
          hospitals: hospitals.hospitals || [],
        }),
      )
      .catch((error) => console.error("Dashboard statistics failed:", error.message));
  }, []);

  const activeIncidents = data.incidents.filter((incident) => incident.status !== "Resolved");
  const pendingIncidents = data.incidents.filter((incident) => incident.status === "Pending");
  const resolvedIncidents = data.incidents.filter((incident) => incident.status === "Resolved");
  const cards = [
    { label: "Total incidents", value: data.incidents.length, icon: Activity, tone: "text-red-400" },
    { label: "Active incidents", value: activeIncidents.length, icon: AlertTriangle, tone: "text-amber-400" },
    { label: "Pending dispatch", value: pendingIncidents.length, icon: Clock, tone: "text-orange-400" },
    { label: "Online volunteers", value: data.volunteers.length, icon: Users, tone: "text-emerald-400" },
    { label: "Hospitals", value: data.hospitals.length, icon: Hospital, tone: "text-sky-400" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <aside className="hidden w-[245px] shrink-0 border-r border-slate-800 bg-slate-900 p-4 lg:block">
        <p className="mb-1 text-lg font-black">QUICKREACH</p>
        <p className="mb-8 text-[9px] font-black uppercase tracking-[0.25em] text-red-500">Operations</p>
        <nav className="space-y-2">
          <button className="flex w-full items-center gap-3 rounded-xl bg-red-600 px-3 py-3 text-left text-xs font-bold"><Activity className="h-4 w-4" /> Dashboard</button>
          <button onClick={() => navigate("/incidents")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"><AlertTriangle className="h-4 w-4" /> Incidents</button>
          <button onClick={() => navigate("/volunteers")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"><Users className="h-4 w-4" /> Manage Volunteers</button>
          <button onClick={() => navigate("/incidents")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"><Hospital className="h-4 w-4" /> Manage Hospitals</button>
          <button onClick={() => navigate("/analytics")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"><BarChart3 className="h-4 w-4" /> Analytics</button>
        </nav>
      </aside>
      <div className="flex-1 p-5 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
          {[['Dashboard', '/dashboard'], ['Incidents', '/incidents'], ['Volunteers', '/volunteers'], ['Hospitals', '/hospitals'], ['Analytics', '/analytics']].map(([label, path]) => <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-300">{label}</button>)}
        </div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-red-500">Dispatcher operations</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Good shift, {user?.name || "Dispatcher"}</h1>
            <p className="mt-2 text-slate-400">A live overview of the QuickReach emergency network.</p>
          </div>
          <button onClick={() => navigate("/incidents")} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold hover:bg-red-500">
            Open incidents <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-slate-900 p-5">
              <div className="mb-5 flex items-center justify-between"><Icon className={cn("h-5 w-5", tone)} /><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /></div>
              <p className="text-3xl font-black">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black">Incident status</h2><span className="text-xs text-slate-500">Live queue</span></div>
            <div className="space-y-4">
              {[{ label: "Active response", value: activeIncidents.length, color: "bg-amber-500" }, { label: "Awaiting dispatch", value: pendingIncidents.length, color: "bg-red-500" }, { label: "Resolved", value: resolvedIncidents.length, color: "bg-emerald-500" }].map((item) => (
                <div key={item.label}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-300">{item.label}</span><span className="font-bold text-white">{item.value}</span></div><div className="h-2 rounded-full bg-slate-800"><div className={cn("h-2 rounded-full", item.color)} style={{ width: `${data.incidents.length ? Math.max((item.value / data.incidents.length) * 100, 3) : 0}%` }} /></div></div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h2 className="mb-4 text-lg font-black">Dispatcher quick actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button onClick={() => navigate("/incidents")} className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700">Review incident queue</button>
              <button onClick={() => navigate("/incidents")} className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700">Monitor response map</button>
              <button onClick={() => navigate("/analytics")} className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700">Open analytics</button>
              <button onClick={() => navigate("/incidents")} className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700">Manage operations</button>
            </div>
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
