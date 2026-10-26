import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Hospital,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Users,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { cn } from "../lib/utils";

export function DispatcherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, profileLoading, signOut } = useAuth();

  const getInitials = (name, email) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "DI";
  };

  const items = [
    ["Dashboard", LayoutDashboard, "/dashboard"],
    ["Incidents", ListChecks, "/incidents"],
    ["Manage Volunteers", Users, "/volunteers"],
    ["Manage Hospitals", Hospital, "/hospitals"],
    ["Analytics", BarChart3, "/analytics"],
  ];

  return (
    <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900 p-3 text-white lg:min-h-screen lg:w-[235px] lg:border-b-0 lg:border-r">
      <div className="border-b border-slate-800 p-2 pb-4">
        <p className="font-black text-white tracking-tight">QUICKREACH</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-red-500">
          Operations
        </p>
      </div>

      <nav className="flex flex-1 gap-1 overflow-x-auto py-3 lg:block lg:space-y-2 lg:overflow-visible">
        {items.map(([label, Icon, path]) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={cn(
              "flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors lg:w-full lg:gap-3 lg:py-3 lg:text-xs",
              location.pathname === path && "bg-red-600 text-white shadow-md shadow-red-900/30",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* User profile card with avatar or fallback initials */}
      {loading && !user ? (
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-slate-800/60 p-3 border border-white/5 animate-pulse">
          <div className="h-9 w-9 rounded-xl bg-slate-700/60 shrink-0" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-3 w-20 rounded bg-slate-700/60" />
            <div className="h-2 w-14 rounded bg-slate-700/40" />
          </div>
        </div>
      ) : user ? (
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-slate-800/80 p-3 border border-white/5">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name || "Dispatcher"}
              className="h-9 w-9 rounded-xl object-cover shrink-0 border border-white/10"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-slate-800 border border-red-500/30 text-xs font-black text-red-400">
              {getInitials(user.name, user.email)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-white" title={user.name || user.email}>
              {user.name || user.email?.split("@")[0] || "Dispatcher"}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                {user.role || "Dispatcher"}
              </span>
              {profileLoading && (
                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" title="Syncing..." />
              )}
            </div>
            {user.email && (
              <p className="truncate text-[10px] text-slate-400" title={user.email}>
                {user.email}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-2 rounded-2xl bg-slate-800/60 p-3 border border-white/5">
          <p className="text-xs font-bold text-slate-400">Not signed in</p>
        </div>
      )}

      <button
        onClick={async () => {
          await signOut();
          navigate("/dispatcher-login");
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl p-2.5 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign out</span>
      </button>
    </aside>
  );
}
