import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShieldAlert,
  HeartHandshake,
  ArrowRight,
  Activity,
  Siren,
  LogIn,
  Ambulance,
  Building2,
  Clock,
  Sparkles,
  Radio,
  UserPlus,
  ChevronDown,
  LogOut,
  Shield,
} from "lucide-react";
import { cn } from "../lib/utils";
import { apiFetch } from "../lib/api";
import { useAuth } from "../components/AuthProvider";

export const LandingPage = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const authMenuRef = useRef(null);

  const [stats, setStats] = useState({
    hospitals: 0,
    volunteers: 0,
    incidents: 0,
    avgResponseSec: 2,
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (authMenuRef.current && !authMenuRef.current.contains(e.target)) {
        setShowAuthMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const statsRes = await apiFetch("/api/stats/public", { auth: false });
        setStats({
          hospitals: statsRes.hospitals_in_use_count || 0,
          volunteers: statsRes.volunteers_online_count || 0,
          incidents: statsRes.incidents_count || 0,
          avgResponseSec: 2,
        });
      } catch (err) {
        console.warn("Public stats fetch failed:", err.message);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="emergency-shell-light min-h-screen w-full bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/70 font-sans text-slate-900 selection:bg-red-100 selection:text-red-900">
      {/* Hero Section */}
      <header
        className={cn(
          "w-full relative overflow-hidden bg-slate-900 text-white px-4 sm:px-6 shadow-2xl transition-all duration-500 ease-in-out",
          activeTab === "home" ? "pb-24 pt-10 rounded-b-[3rem]" : "pb-12 pt-8 rounded-b-[2rem]",
        )}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-15 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-red-500 rounded-full blur-[110px]" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-red-700 rounded-full blur-[110px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[140px]" />
        </div>

        {/* Navigation Bar */}
        <nav className="relative z-10 flex items-center justify-between max-w-6xl mx-auto mb-10 md:mb-16">
          <Link
            to="/"
            onClick={() => setActiveTab("home")}
            className="flex items-center gap-3 group"
          >
            <div className="w-11 h-11 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/50 group-hover:scale-105 transition-transform">
              <Siren className="text-white w-6 h-6 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter leading-tight">
                QuickReach
              </span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-none">
                Emergency Net
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center gap-6 text-sm font-bold text-slate-300">
              <button
                onClick={() => setActiveTab("home")}
                className={cn(
                  "transition-colors hover:text-white",
                  activeTab === "home"
                    ? "text-white underline decoration-red-500 decoration-4 underline-offset-8"
                    : "",
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={cn(
                  "transition-colors hover:text-white",
                  activeTab === "about"
                    ? "text-white underline decoration-red-500 decoration-4 underline-offset-8"
                    : "",
                )}
              >
                About
              </button>
            </div>

            {/* Top Right Sign In / Portal Selector Dropdown */}
            <div className="relative" ref={authMenuRef}>
              <button
                onClick={() => setShowAuthMenu((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all shadow-md hover:scale-105 backdrop-blur-md border",
                  showAuthMenu
                    ? "bg-red-600 text-white border-red-500 shadow-red-900/40"
                    : "bg-white/10 hover:bg-white/20 text-white border-white/20",
                )}
              >
                <LogIn className="w-4 h-4 text-red-400" />
                <span>Sign In</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 opacity-70 transition-transform duration-200",
                    showAuthMenu && "rotate-180",
                  )}
                />
              </button>

              {/* Portal Dropdown Menu */}
              {showAuthMenu && (
                <div className="absolute right-0 mt-3 w-80 rounded-3xl border border-white/10 bg-slate-900/95 p-3 text-white shadow-2xl backdrop-blur-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {user && (
                    <div className="mb-2 rounded-2xl bg-slate-800/80 p-3 border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Active Session
                        </span>
                        <span className="rounded-full bg-red-600/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-400 border border-red-500/30">
                          {role}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">
                        {user.name || user.email}
                      </p>
                      <Link
                        to={role === "volunteer" ? "/volunteer" : "/dashboard"}
                        onClick={() => setShowAuthMenu(false)}
                        className="mt-2.5 flex items-center justify-between rounded-xl bg-red-600 hover:bg-red-500 px-3 py-2 text-xs font-bold text-white transition-colors"
                      >
                        <span>Go to {role === "volunteer" ? "Volunteer Portal" : "Dispatcher Dashboard"}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  )}

                  <div className="space-y-1 text-left">
                    <p className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Operations Portals
                    </p>

                    {/* Dispatcher Portal Login */}
                    <Link
                      to="/dispatcher-login"
                      onClick={() => setShowAuthMenu(false)}
                      className="group flex items-start gap-3 rounded-2xl p-2.5 hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="rounded-xl bg-red-600/20 p-2 text-red-500 border border-red-500/30 group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <Radio className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-red-400 transition-colors">
                          Dispatcher Login
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Emergency triage & command center
                        </p>
                      </div>
                    </Link>

                    {/* Volunteer First Responder Login */}
                    <Link
                      to="/volunteer-login"
                      onClick={() => setShowAuthMenu(false)}
                      className="group flex items-start gap-3 rounded-2xl p-2.5 hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="rounded-xl bg-emerald-600/20 p-2 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Shield className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          Volunteer Login
                        </p>
                        <p className="text-[11px] text-slate-400">
                          First responder mission check-in
                        </p>
                      </div>
                    </Link>

                    {/* Volunteer Sign Up */}
                    <Link
                      to="/volunteer-login?signup=true"
                      onClick={() => setShowAuthMenu(false)}
                      className="group flex items-start gap-3 rounded-2xl p-2.5 hover:bg-slate-800/80 transition-colors"
                    >
                      <div className="rounded-xl bg-amber-600/20 p-2 text-amber-400 border border-amber-500/30 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                          Volunteer Sign Up
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Apply to join community responders
                        </p>
                      </div>
                    </Link>
                  </div>

                  {user && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <button
                        onClick={async () => {
                          setShowAuthMenu(false);
                          await signOut();
                          navigate("/");
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl p-2 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </nav>

        {activeTab === "home" && (
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              Live Emergency Response System
            </div>

            <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
              Emergency Response <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-rose-400">
                Reimagined.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              The fastest way to connect citizens in distress with professional
              dispatchers, ambulances, and nearby first responders. Seconds save lives.
            </p>

            <div className="pt-6">
              <Link
                to="/panic"
                className="group relative inline-flex items-center justify-center gap-3 px-9 py-5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full text-lg font-black uppercase tracking-widest shadow-2xl shadow-red-900/50 hover:scale-105 transition-all overflow-hidden border border-red-400/30"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                <span>Emergency Panic Button</span>
              </Link>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-3">
                No sign in required for emergencies
              </p>
            </div>
          </div>
        )}
      </header>

      {/* OVERVIEW CONTENT */}
      {activeTab === "home" && (
        <main
          id="overview"
          className="w-full max-w-6xl mx-auto px-4 sm:px-6 -mt-12 relative z-20 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          {/* Stats Bar */}
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100/90 grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-black text-slate-900 mb-1 flex items-center justify-center gap-1">
                <span>{stats.avgResponseSec}s</span>
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                <span>Response Time</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-slate-900 mb-1">
                {stats.hospitals > 0 ? stats.hospitals : "—"}
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-red-500" />
                <span>Hospitals Connected</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-slate-900 mb-1">
                {stats.volunteers > 0 ? stats.volunteers : "—"}
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <HeartHandshake className="w-3.5 h-3.5 text-red-500" />
                <span>Active Volunteers</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-slate-900 mb-1">
                {stats.incidents > 0 ? stats.incidents : "—"}
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center justify-center gap-1">
                <Activity className="w-3.5 h-3.5 text-red-500" />
                <span>Incidents Handled</span>
              </div>
            </div>
          </div>


          {/* How It Works Section */}
          <section className="mt-20 bg-white p-10 md:p-14 rounded-3xl border border-slate-100 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Three Simple Steps
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3">
                Every Second Counts
              </h2>
              <p className="text-slate-500 font-semibold text-sm">
                How QuickReach coordinates an emergency response from distress signal to hospital arrival.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center shadow-lg border-4 border-white mb-6">
                  <span className="text-3xl font-black text-red-600">1</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Signal for Help
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Press the Panic Button on web or dial USSD. We immediately pinpoint
                  your location and identify the emergency category.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center shadow-lg border-4 border-white mb-6">
                  <span className="text-3xl font-black text-red-600">2</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Instant Coordination
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Dispatchers confirm your case while nearby certified volunteers and
                  emergency teams receive immediate mobilization alerts.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center shadow-lg border-4 border-white mb-6">
                  <span className="text-3xl font-black text-red-600">3</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Care & Arrival
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Track responding units on live maps. Nearest medical facilities are
                  notified in advance for immediate trauma intake.
                </p>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ABOUT TAB CONTENT */}
      {activeTab === "about" && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section
            id="about"
            className="py-20 bg-slate-900 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 -left-10 w-96 h-96 bg-red-600 rounded-full blur-[128px]" />
              <div className="absolute bottom-0 -right-10 w-96 h-96 bg-red-600 rounded-full blur-[128px]" />
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col md:flex-row items-center gap-16">
              <div className="md:w-1/2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest mb-6">
                  <Activity className="w-4 h-4 text-red-500" />
                  Our Mission
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                  Bridging the gap between{" "}
                  <span className="text-red-400">Chaos</span> and{" "}
                  <span className="text-red-300">Care</span>.
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed mb-8">
                  QuickReach isn't just an app; it's a lifeline. We connect
                  citizens in crisis directly with the nearest emergency
                  responders, bypassing traditional bottlenecks.
                  <br />
                  <br />
                  By integrating real-time GPS tracking, automated hospital
                  triage, and a network of trained community volunteers, we
                  ensure that help is always just a tap away. We are building
                  the future of Ethiopian emergency response.
                </p>
                <div className="flex gap-4">
                  <div className="flex flex-col gap-1 border-l-4 border-red-500 pl-4">
                    <span className="text-2xl font-black">Zero</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Wait Time
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-l-4 border-red-700 pl-4">
                    <span className="text-2xl font-black">100%</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Digital Triage
                    </span>
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 grid grid-cols-2 gap-4">
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 transform translate-y-8">
                  <Siren className="w-10 h-10 text-red-500 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Rapid Dispatch</h4>
                  <p className="text-slate-400 text-sm">
                    Automated routing to the nearest available ambulance unit.
                  </p>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <HeartHandshake className="w-10 h-10 text-red-400 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Volunteer Net</h4>
                  <p className="text-slate-400 text-sm">
                    Crowdsourced first aid from trained locals nearby.
                  </p>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 transform translate-y-8">
                  <h4 className="text-lg font-bold mb-2">Hospital Sync</h4>
                  <p className="text-slate-400 text-sm">
                    Real-time bed availability and patient intake data.
                  </p>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <ShieldAlert className="w-10 h-10 text-red-500 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Crisis Mode</h4>
                  <p className="text-slate-400 text-sm">
                    Instant multi-agency alerts for mass casualty events.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 font-bold text-sm">
            &copy; 2026 QuickReach Ethiopia. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="/first-aid"
              className="text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors"
            >
              First Aid Guide
            </Link>

            <Link
              to="/login"
              className="text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors"
            >
              Staff Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
