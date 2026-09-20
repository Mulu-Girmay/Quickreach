import React from "react";
import { Activity, LogOut, MapPin } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useNavigate } from "react-router-dom";

export function VolunteerSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  return (
    <aside className="relative z-20 flex w-full shrink-0 flex-col border-b border-white/10 bg-slate-900/90 p-3 text-white backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-b-0 lg:border-r">
      <div className="border-b border-white/10 p-2 pb-4">
        <p className="font-black">QUICKREACH</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-red-400">
          Volunteer Portal
        </p>
      </div>
      <nav className="flex gap-1 overflow-x-auto py-3 lg:block lg:space-y-2 lg:overflow-visible">
        {[
          ["Dashboard", Activity, "/volunteer"],
          ["My Active Incidents", Activity, "/active"],
          ["All Available Incidents", MapPin, "/volunteer/incidents"],
        ].map(([label, Icon, path]) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:bg-white/10 lg:w-full"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      <div className="mb-2 mt-auto rounded-xl bg-slate-800 p-3">
        <p className="truncate text-xs font-bold">
          {user?.name || user?.email || "Volunteer"}
        </p>
        <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-red-400">
          Volunteer
        </p>
      </div>
      <button
        onClick={signOut}
        className="flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold text-slate-400 hover:bg-white/10"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </aside>
  );
}
