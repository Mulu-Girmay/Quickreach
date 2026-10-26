import React, { useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Search,
  RefreshCw,
  Shield,
  Activity,
  Ambulance,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../lib/utils";

export function VolunteerManagementTab({
  volunteers = [],
  onUpdateApproval,
  onLocateOnMap,
  onRefresh,
  loading = false,
  onSelectIncident,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'online' | 'pending' | 'approved' | 'rejected'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Computed metrics
  const totalCount = volunteers.length;
  const onlineCount = volunteers.filter((v) => v.is_online).length;
  const pendingCount = volunteers.filter(
    (v) => v.approval_status === "pending",
  ).length;
  const approvedCount = volunteers.filter(
    (v) => v.approval_status === "approved",
  ).length;
  const activeMissionCount = volunteers.filter(
    (v) => v.active_incident != null,
  ).length;

  // Filtered volunteers
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((vol) => {
      // Status filter
      if (statusFilter === "online" && !vol.is_online) return false;
      if (statusFilter === "pending" && vol.approval_status !== "pending")
        return false;
      if (statusFilter === "approved" && vol.approval_status !== "approved")
        return false;
      if (statusFilter === "rejected" && vol.approval_status !== "rejected")
        return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const name = (vol.name || "").toLowerCase();
      const email = (vol.email || "").toLowerCase();
      const phone = (vol.phone || "").toLowerCase();
      return name.includes(term) || email.includes(term) || phone.includes(term);
    });
  }, [volunteers, statusFilter, searchTerm]);

  const handleAction = async (id, status) => {
    setActionLoadingId(id);
    try {
      await onUpdateApproval(id, status);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatLastActive = (dateStr) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 2) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8 text-white">
      {/* Header and Quick Stats */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-red-600/20 p-2 border border-red-500/30 text-red-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl text-white">
                Volunteer Network Management
              </h1>
              <p className="text-xs text-slate-400">
                Monitor live availability, review applications, and track active responders.
              </p>
            </div>
          </div>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 border border-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Total</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-white">{totalCount}</p>
          <span className="text-[10px] text-slate-500">Registered Responders</span>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Online Now</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{onlineCount}</p>
          <span className="text-[10px] text-emerald-500/80">Available on Call</span>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{pendingCount}</p>
          <span className="text-[10px] text-amber-500/80">
            {pendingCount > 0 ? "Requires approval" : "All reviewed"}
          </span>
        </div>

        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-sky-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Active Missions</span>
            <Ambulance className="h-4 w-4 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400">{activeMissionCount}</p>
          <span className="text-[10px] text-sky-500/80">Currently Dispatched</span>
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider">Approved</span>
            <Shield className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-slate-200">{approvedCount}</p>
          <span className="text-[10px] text-slate-500">Certified Responders</span>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search volunteers by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl bg-slate-800/80 py-2 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-400 outline-none focus:ring-1 focus:ring-red-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All" },
            { id: "online", label: "🟢 Online" },
            { id: "pending", label: `⏳ Pending (${pendingCount})` },
            { id: "approved", label: "✅ Approved" },
            { id: "rejected", label: "❌ Rejected" },
          ].map((chip) => (
            <button
              key={chip.id}
              onClick={() => setStatusFilter(chip.id)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                statusFilter === chip.id
                  ? "bg-red-600 text-white shadow-md shadow-red-900/30"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Volunteers Table */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
        {loading && volunteers.length === 0 ? (
          <div className="py-20 text-center text-slate-400">
            <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-red-500" />
            <p className="text-sm font-bold">Loading volunteer roster...</p>
          </div>
        ) : filteredVolunteers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <h3 className="text-base font-bold text-white">No volunteers match your criteria</h3>
            <p className="mt-1 text-xs text-slate-500">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-slate-950/60 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5">Volunteer</th>
                  <th className="px-4 py-3.5">Contact</th>
                  <th className="px-4 py-3.5">Live Status</th>
                  <th className="px-4 py-3.5">Approval</th>
                  <th className="px-4 py-3.5">Mission / Assignment</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredVolunteers.map((vol) => {
                  const isActionLoading = actionLoadingId === vol._id;
                  const hasLocation =
                    Number.isFinite(Number(vol.lat)) &&
                    Number.isFinite(Number(vol.lng));

                  return (
                    <tr
                      key={vol._id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Name & Role */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-slate-800 border border-red-500/30 text-xs font-black text-red-400">
                            {vol.name
                              ? vol.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()
                              : "V"}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{vol.name}</p>
                            <span className="text-[10px] text-slate-500">
                              Registered{" "}
                              {vol.created_at
                                ? new Date(vol.created_at).toLocaleDateString([], {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="px-4 py-4 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Mail className="h-3 w-3 text-slate-500 shrink-0" />
                          <span className="truncate max-w-[160px] text-[11px]">{vol.email}</span>
                        </div>
                        {vol.phone ? (
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="h-3 w-3 text-emerald-400 shrink-0" />
                            <a
                              href={`tel:${vol.phone}`}
                              className="text-[11px] text-emerald-400 hover:underline"
                            >
                              {vol.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-600">No phone</span>
                        )}
                      </td>

                      {/* Live Status (Online/Offline) */}
                      <td className="px-4 py-4">
                        {vol.is_online ? (
                          <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-bold text-emerald-400 text-[11px]">Online</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                            <div className="text-[10px] text-slate-500">
                              <span className="block font-medium">Offline</span>
                              <span>{formatLastActive(vol.last_active)}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Approval Status */}
                      <td className="px-4 py-4">
                        {vol.approval_status === "approved" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                            <Check className="h-3 w-3" /> Approved
                          </span>
                        ) : vol.approval_status === "pending" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-300 border border-amber-500/30 animate-pulse">
                            <Clock className="h-3 w-3" /> Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-red-400 border border-red-500/20">
                            <X className="h-3 w-3" /> Rejected
                          </span>
                        )}
                      </td>

                      {/* Mission / Active Incident */}
                      <td className="px-4 py-4">
                        {vol.active_incident ? (
                          <button
                            onClick={() => onSelectIncident?.(vol.active_incident)}
                            className="group flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/20 px-2.5 py-1 text-left text-[11px] font-bold text-red-400 hover:bg-red-500/20 transition-colors"
                          >
                            <Ambulance className="h-3.5 w-3.5 shrink-0 animate-pulse" />
                            <span className="truncate max-w-[130px]">
                              {vol.active_incident.type} emergency
                            </span>
                            <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                          </button>
                        ) : vol.is_online && vol.approval_status === "approved" ? (
                          <span className="text-[11px] font-semibold text-emerald-400/90 flex items-center gap-1">
                            <Activity className="h-3 w-3" /> Available for dispatch
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Map Pin Button */}
                          {hasLocation && onLocateOnMap && (
                            <button
                              onClick={() => onLocateOnMap(vol)}
                              title="Locate volunteer on live map"
                              className="rounded-lg bg-slate-800 p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                              <MapPin className="h-4 w-4 text-red-400" />
                            </button>
                          )}

                          {/* Approval toggles */}
                          {vol.approval_status === "pending" ? (
                            <>
                              <button
                                onClick={() => handleAction(vol._id, "approved")}
                                disabled={isActionLoading}
                                className="flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 px-2.5 py-1.5 text-[11px] font-bold text-white transition-colors disabled:opacity-50"
                                title="Approve volunteer"
                              >
                                <Check className="h-3.5 w-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                onClick={() => handleAction(vol._id, "rejected")}
                                disabled={isActionLoading}
                                className="flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-red-950 px-2.5 py-1.5 text-[11px] font-bold text-red-400 transition-colors disabled:opacity-50"
                                title="Reject application"
                              >
                                <X className="h-3.5 w-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : vol.approval_status === "approved" ? (
                            <button
                              onClick={() => handleAction(vol._id, "rejected")}
                              disabled={isActionLoading}
                              className="rounded-lg bg-slate-800/80 hover:bg-red-950/80 px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-red-300 transition-colors disabled:opacity-50"
                              title="Revoke approval"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              onClick={() => handleAction(vol._id, "approved")}
                              disabled={isActionLoading}
                              className="rounded-lg bg-emerald-950/60 hover:bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:text-white transition-colors disabled:opacity-50"
                              title="Re-approve volunteer"
                            >
                              Re-Approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
