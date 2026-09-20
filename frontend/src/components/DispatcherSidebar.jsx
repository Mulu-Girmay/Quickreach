import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Hospital, LayoutDashboard, ListChecks, LogOut, Users } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { cn } from "../lib/utils";

export function DispatcherSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const items = [["Dashboard", LayoutDashboard, "/dashboard"], ["Incidents", ListChecks, "/incidents"], ["Manage Volunteers", Users, "/volunteers"], ["Manage Hospitals", Hospital, "/hospitals"], ["Analytics", BarChart3, "/analytics"]];
  return <aside className="flex min-h-0 w-full shrink-0 flex-col border-b border-slate-800 bg-slate-900 p-3 text-white lg:min-h-screen lg:w-[235px] lg:border-b-0 lg:border-r">
    <div className="border-b border-slate-800 p-2 pb-4"><p className="font-black">QUICKREACH</p><p className="text-[9px] font-black uppercase tracking-widest text-red-500">Operations</p></div>
    <nav className="flex flex-1 gap-1 overflow-x-auto py-3 lg:block lg:space-y-2 lg:overflow-visible">{items.map(([label, Icon, path]) => <button key={path} onClick={() => navigate(path)} className={cn("flex min-w-max items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold text-slate-400 hover:bg-slate-800 hover:text-white lg:w-full lg:gap-3 lg:py-3 lg:text-xs", location.pathname === path && "bg-red-600 text-white")}><Icon className="h-4 w-4" />{label}</button>)}</nav>
    <div className="mb-2 rounded-xl bg-slate-800 p-3"><p className="truncate text-xs font-bold">{user?.name || user?.email || "Dispatcher"}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-red-400">Dispatcher</p></div>
    <button onClick={signOut} className="flex items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold text-slate-500 hover:bg-slate-800 hover:text-white"><LogOut className="h-4 w-4" />Sign out</button>
  </aside>;
}
