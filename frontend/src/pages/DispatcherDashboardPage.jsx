import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Hospital,
  Users,
  Clock,
  BarChart3,
  UserPlus,
  X,
  Shield,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Mail,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { DispatcherSidebar } from "../components/DispatcherSidebar";
import { apiFetch } from "../lib/api";
import { cn } from "../lib/utils";

const getInitials = (name, email) => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "DI";
};

function CreateDispatcherModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Please provide the full name for the dispatcher.");
      return;
    }
    if (!form.email.trim() || !form.email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/dispatchers", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        },
      });

      const newDispatcher = res.user;
      setSuccess(`Dispatcher account created successfully for ${newDispatcher.email}!`);
      setForm({ name: "", email: "", password: "" });

      if (onCreated && newDispatcher) {
        onCreated(newDispatcher);
      }

      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setError(err.message || "Failed to create dispatcher account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-red-600/20 p-2.5 text-red-500 border border-red-500/30">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Create Dispatcher</h2>
              <p className="text-xs text-slate-400">Add an authorized emergency coordinator.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Connor"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl bg-slate-800/90 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Official Email
            </label>
            <input
              type="email"
              required
              placeholder="dispatcher@quickreach.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-xl bg-slate-800/90 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Initial Password (min 8 characters)
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full rounded-xl bg-slate-800/90 border border-white/10 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              This credential will be used for first-time access. The dispatcher will be prompted to update it on initial sign-in.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-4 py-3 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-all shadow-lg shadow-red-900/30"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? "Creating Account..." : "Create Dispatcher"}</span>
            </button>
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-amber-500/30 bg-slate-900 p-6 text-white shadow-2xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-black">Change Your Password</h2>
        </div>
        <p className="mb-4 text-xs text-amber-400">
          You are using a temporary password. Please set a new secure password before continuing.
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
            minLength={8}
            placeholder="New password (min 8 chars)"
            value={form.new_password}
            onChange={(e) => setForm((f) => ({ ...f, new_password: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Confirm new password"
            value={form.confirm_password}
            onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm outline-none"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-60 transition-colors"
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
  const [dispatchers, setDispatchers] = useState([]);
  const [dispatchersLoading, setDispatchersLoading] = useState(true);
  const [showCreateDispatcher, setShowCreateDispatcher] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(user?.must_change_password === true);

  const loadData = async () => {
    try {
      const [incidents, volunteers, hospitals, dispatchersRes] = await Promise.all([
        apiFetch("/api/incidents").catch(() => ({ incidents: [] })),
        apiFetch("/api/volunteers/online").catch(() => ({ volunteers: [] })),
        apiFetch("/api/hospitals").catch(() => ({ hospitals: [] })),
        apiFetch("/api/auth/dispatchers").catch(() => ({ dispatchers: [] })),
      ]);

      setData({
        incidents: incidents.incidents || [],
        volunteers: volunteers.volunteers || [],
        hospitals: hospitals.hospitals || [],
      });
      setDispatchers(dispatchersRes.dispatchers || []);
    } catch (error) {
      console.error("Dashboard statistics failed:", error.message);
    } finally {
      setDispatchersLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeactivateDispatcher = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to deactivate dispatcher "${name}"? They will no longer be permitted to log in.`,
      )
    ) {
      return;
    }
    try {
      await apiFetch(`/api/auth/dispatchers/${id}/deactivate`, {
        method: "PATCH",
      });
      setDispatchers((prev) =>
        prev.map((d) => (d._id === id ? { ...d, is_active: false } : d)),
      );
    } catch (err) {
      alert(err.message || "Failed to deactivate dispatcher.");
    }
  };

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
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      {/* Shared Dispatcher Sidebar */}
      <DispatcherSidebar />

      <main className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-8 lg:p-12">
        <div className="mx-auto max-w-7xl">
          {/* Top Header */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-red-500">
                Dispatcher operations
              </p>
              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                Good shift, {user?.name || "Dispatcher"}
              </h1>
              <p className="mt-2 text-slate-400">
                Live situational overview of the QuickReach emergency network.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateDispatcher(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-3 text-sm font-bold text-white border border-white/10 transition-colors"
              >
                <UserPlus className="h-4 w-4 text-red-400" />
                <span>Create Dispatcher</span>
              </button>
              <button
                onClick={() => navigate("/incidents")}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-900/30"
              >
                <span>Open incidents</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Telemetry Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <Icon className={cn("h-5 w-5", tone)} />
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                </div>
                <p className="text-3xl font-black">{value}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Operational Queues & Actions */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black">Incident status</h2>
                <span className="text-xs text-slate-500">Live queue</span>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Active response", value: activeIncidents.length, color: "bg-amber-500" },
                  { label: "Awaiting dispatch", value: pendingIncidents.length, color: "bg-red-500" },
                  { label: "Resolved", value: resolvedIncidents.length, color: "bg-emerald-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="font-bold text-white">{item.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div
                        className={cn("h-2 rounded-full", item.color)}
                        style={{
                          width: `${
                            data.incidents.length
                              ? Math.max((item.value / data.incidents.length) * 100, 3)
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-black">Dispatcher quick actions</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => navigate("/incidents")}
                  className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                  Review incident queue
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                  Monitor response map
                </button>
                <button
                  onClick={() => navigate("/volunteers")}
                  className="rounded-xl bg-slate-800 p-4 text-left text-sm font-bold hover:bg-slate-700 transition-colors"
                >
                  Review volunteer approvals
                </button>
                <button
                  onClick={() => setShowCreateDispatcher(true)}
                  className="flex items-center gap-2 rounded-xl bg-red-600/10 border border-red-500/20 p-4 text-left text-sm font-bold text-red-400 hover:bg-red-600/20 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create Dispatcher</span>
                </button>
              </div>
            </section>
          </div>

          {/* Dispatcher Team Management Section */}
          <section className="mt-8 rounded-3xl border border-white/10 bg-slate-900 p-6 sm:p-8 shadow-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-red-600/20 p-2 text-red-500 border border-red-500/30">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Dispatcher Operations Team</h2>
                    <p className="text-xs text-slate-400">
                      Authorized coordinators with system dispatch access.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400 border border-white/5">
                  {dispatchers.length} Account{dispatchers.length === 1 ? "" : "s"}
                </span>
                <button
                  onClick={() => setShowCreateDispatcher(true)}
                  className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition-colors shadow-md shadow-red-900/30"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Create Dispatcher</span>
                </button>
              </div>
            </div>

            {dispatchersLoading && dispatchers.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-red-500" />
                <p className="text-xs font-bold">Loading dispatch team roster...</p>
              </div>
            ) : dispatchers.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                No dispatchers registered yet. Click &ldquo;Create Dispatcher&rdquo; to add your first team member.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-white/10 bg-slate-950/40 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Dispatcher</th>
                      <th className="px-4 py-3">Email Address</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Account Status</th>
                      <th className="px-4 py-3">Registered</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {dispatchers.map((d) => {
                      const isSelf = String(d._id) === String(user?._id);
                      const isActive = d.is_active !== false;

                      return (
                        <tr key={d._id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-slate-800 border border-red-500/30 text-xs font-black text-red-400">
                                {getInitials(d.name, d.email)}
                              </div>
                              <div>
                                <p className="font-bold text-white flex items-center gap-1.5">
                                  <span>{d.name || "Dispatcher"}</span>
                                  {isSelf && (
                                    <span className="rounded bg-red-600/20 text-red-400 border border-red-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase">
                                      You
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-slate-300">
                            <div className="flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-slate-500" />
                              <span className="text-[11px] font-medium">{d.email}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-300 border border-white/5">
                              <Shield className="h-2.5 w-2.5 text-red-400" />
                              {d.role || "dispatcher"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-[11px] text-slate-500">
                            {d.created_at
                              ? new Date(d.created_at).toLocaleDateString([], {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>

                          <td className="px-4 py-3.5 text-right">
                            {!isSelf && isActive && (
                              <button
                                onClick={() => handleDeactivateDispatcher(d._id, d.name || d.email)}
                                className="rounded-lg bg-slate-800/80 hover:bg-red-950/80 px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-red-400 transition-colors"
                                title="Deactivate this dispatcher account"
                              >
                                Deactivate
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      {showCreateDispatcher && (
        <CreateDispatcherModal
          onClose={() => setShowCreateDispatcher(false)}
          onCreated={(newDispatcher) => {
            setDispatchers((prev) => [newDispatcher, ...prev]);
          }}
        />
      )}

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
