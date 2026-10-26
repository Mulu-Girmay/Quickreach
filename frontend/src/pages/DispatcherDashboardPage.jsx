import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, Hospital, Users, Clock, BarChart3, UserPlus, X } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";

function CreateDispatcherModal({ onClose }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/dispatchers", {
        method: "POST",
        body: form,
      });
      setSuccess(`Account created for ${res.user.email}. The password has been sent to their email.`);
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-black">Create Dispatcher Account</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            placeholder="Temporary password (min 8 chars)"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          <p className="text-xs text-slate-500">
            This password will be emailed to the new dispatcher. They will be prompted to change it on first login.
          </p>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && <p className="text-sm text-emerald-400">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold hover:bg-red-500 disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create Dispatcher"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match.");
      return;
    }
    if (form.new_password.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "PATCH",
        body: { current_password: form.current_password, new_password: form.new_password },
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-slate-900 p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-black">Change Your Password</h2>
        </div>
        <p className="mb-4 text-xs text-amber-400">
          You are using a temporary password. Please set a new one before continuing.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            required
            placeholder="Current (temporary) password"
            value={form.current_password}
            onChange={(e) => setForm((f) => ({ ...f, current_password: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            placeholder="New password (min 8 chars)"
            value={form.new_password}
            onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            placeholder="Confirm new password"
            value={form.confirm_password}
            onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-60"
          >
            {loading ? "Updating..." : "Set New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function DispatcherDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState({ incidents: [], volunteers: [], hospitals: [] });
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(user?.must_change_password === true);

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
          <button onClick={() => navigate("/hospitals")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"><Hospital className="h-4 w-4" /> Manage Hospitals</button>
          <button onClick={() => navigate("/analytics")} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"><BarChart3 className="h-4 w-4" /> Analytics</button>
        </nav>
      </aside>
      <div className="flex-1 p-5 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex gap-2 overflow-x-auto lg:hidden">
            {[["Dashboard", "/dashboard"], ["Incidents", "/incidents"], ["Volunteers", "/volunteers"], ["Hospitals", "/hospitals"], ["Analytics", "/analytics"]].map(([label, path]) => (
              <button key={path} onClick={() => navigate(path)} className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-300">{label}</button>
            ))}
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
                <button
                  onClick={() => setShowCreateDispatcher(true)}
                  className="flex items-center gap-2 rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700"
                >
                  <UserPlus className="h-4 w-4 text-red-400" /> Add Dispatcher
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {showCreateDispatcher && <CreateDispatcherModal onClose={() => setShowCreateDispatcher(false)} />}
      {showChangePassword && <ChangePasswordModal onClose={() => setShowChangePassword(false)} />}
    </div>
  );
}
