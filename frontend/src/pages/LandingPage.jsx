import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  LayoutDashboard,
  HeartHandshake,
  ArrowRight,
  Activity,
  Siren,
} from "lucide-react";
import { cn } from "../lib/utils";
import { supabase } from "../lib/supabase";

export const LandingPage = () => {
  const [activeTab, setActiveTab] = useState("roles");
  const [stats, setStats] = useState({
    hospitals: 0,
    volunteers: 0,
    incidents: 0,
    avgResponseSec: 0,
  });

  useEffect(() => {
    const distanceKm = (lat1, lng1, lat2, lng2) => {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const getNearestHospitalId = (incident, hospitals) => {
      const iLat = Number(incident?.lat);
      const iLng = Number(incident?.lng);
      if (!Number.isFinite(iLat) || !Number.isFinite(iLng)) return null;

      let nearestId = null;
      let nearestKm = Infinity;
      for (const h of hospitals) {
        const hLat = Number(h?.lat);
        const hLng = Number(h?.lng);
        if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;
        const km = distanceKm(iLat, iLng, hLat, hLng);
        if (km < nearestKm) {
          nearestKm = km;
          nearestId = h.id;
        }
      }
      return nearestId;
    };

    const fetchStats = async () => {
      const [hospitalsRes, volunteersRes, incidentsRes] = await Promise.all([
        supabase.from("hospitals").select("id, lat, lng"),
        supabase
          .from("volunteers")
          .select("id", { count: "exact", head: true }),
        supabase.from("incidents").select("id, lat, lng, hospital_id"),
      ]);

      const hospitals = hospitalsRes.data || [];
      const incidents = incidentsRes.data || [];
      const usedHospitalIds = new Set();
      for (const incident of incidents) {
        if (incident.hospital_id) {
          usedHospitalIds.add(incident.hospital_id);
          continue;
        }
        const nearestId = getNearestHospitalId(incident, hospitals);
        if (nearestId) usedHospitalIds.add(nearestId);
      }

      setStats({
        hospitals: usedHospitalIds.size,
        volunteers: volunteersRes.count || 0,
        incidents: incidents.length,
        avgResponseSec: 2, // Can be computed from timeline data later
      });
    };

    fetchStats();

    const channel = supabase
      .channel("landing-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hospitals" },
        fetchStats,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "volunteers" },
        fetchStats,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "incidents" },
        fetchStats,
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  return (
    <div className="emergency-shell-light min-h-screen w-full bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100/70 font-sans text-slate-900 selection:bg-red-100 selection:text-red-900">
      {/* Hero Section */}
      <header
        className={cn(
          "w-full relative overflow-hidden bg-slate-900 text-white px-4 sm:px-6 shadow-2xl transition-all duration-500 ease-in-out",
          activeTab === "roles" ? "pb-20 pt-10 rounded-b-[3rem]" : "pb-10 pt-6",
        )}
      >
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-red-500 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500 rounded-full blur-[100px]" />
        </div>

        <nav className="relative z-10 flex items-center justify-between max-w-7xl mx-auto mb-6 md:mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/50">
              <Siren className="text-white w-6 h-6 animate-pulse" />
            </div>
            <span className="text-2xl font-black tracking-tighter">
              QuickReach
            </span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-bold text-slate-300">
            <button
              onClick={() => setActiveTab("roles")}
              className={cn(
                "transition-colors hover:text-white",
                activeTab === "roles"
                  ? "text-white underline decoration-red-500 decoration-4 underline-offset-8"
                  : "",
              )}
            >
              Roles
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={cn(
                "transition-colors hover:text-white",
                activeTab === "about"
                  ? "text-white underline decoration-blue-500 decoration-4 underline-offset-8"
                  : "",
              )}
            >
              About
            </button>
          </div>
        </nav>
        <div className="relative z-10 md:hidden max-w-7xl mx-auto mb-8">
          <div className="inline-flex w-full rounded-xl border border-white/10 bg-slate-800/70 p-1">
            <button
              onClick={() => setActiveTab("roles")}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                activeTab === "roles"
                  ? "bg-red-600 text-white"
                  : "text-slate-300 hover:text-white",
              )}
            >
              Roles
            </button>
            <button
              onClick={() => setActiveTab("about")}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                activeTab === "about"
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:text-white",
              )}
            >
              About
            </button>
          </div>
        </div>

        {activeTab === "roles" && (
          <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest mb-4">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
              Live Emergency Response System
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-tight">
              Emergency Response <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                Reimagined.
              </span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              The fastest way to connect citizens in distress with professional
              dispatchers and volunteers. Seconds save lives.
            </p>

            <div className="pt-8">
              <Link
                to="/panic"
                className="group relative inline-flex items-center justify-center gap-3 px-5 py-4 sm:px-8 sm:py-5 bg-red-600 text-white rounded-full text-sm sm:text-lg font-black uppercase tracking-widest shadow-xl shadow-red-900/40 hover:scale-105 transition-transform overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform" />
                <ShieldAlert className="w-6 h-6 animate-pulse" />
                <span>Emergency Panic Button</span>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ROLES TAB CONTENT */}
      {activeTab === "roles" && (
        <main
          id="roles"
          className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-20 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Dispatcher Card */}
            <Link
              to="/dispatcher-login"
              className="group bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <LayoutDashboard className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900">
                Dispatcher Portal
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Command center for managing active incidents, tracking
                ambulances, and coordinating response teams.
              </p>
              <div className="flex items-center text-blue-600 font-bold text-sm group-hover:gap-2 transition-all">
                <span>Access Dashboard</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>

            {/* Volunteer Card */}
            <Link
              to="/volunteer-login"
              className="group bg-white p-8 rounded-3xl shadow-xl border border-slate-100 hover:shadow-2xl transition-all hover:-translate-y-1"
            >
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mb-6 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-slate-900">
                Volunteer Mode
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Join the community response network. Receive alerts for nearby
                emergencies and provide first aid.
              </p>
              <div className="flex items-center text-green-600 font-bold text-sm group-hover:gap-2 transition-all">
                <span>Join Response</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>
          </div>

          {/* Stats / Trust Section */}
          <div className="max-w-5xl mx-auto mt-20 grid grid-cols-2 md:grid-cols-4 gap-5 sm:gap-8 border-t border-slate-200 pt-12">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                {stats.avgResponseSec}s
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Response Time
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                {stats.hospitals > 0 ? stats.hospitals : "—"}
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Hospitals Connected
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                {stats.volunteers > 0 ? stats.volunteers : "—"}
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Active Volunteers
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-black text-slate-900 mb-1">
                {stats.incidents > 0 ? stats.incidents : "—"}
              </div>
              <div className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                Incidents Handled
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ABOUT TAB CONTENT */}
      {activeTab === "about" && (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* About Section */}
          <section
            id="about"
            className="py-24 bg-slate-900 text-white relative overflow-hidden"
          >
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 -left-10 w-96 h-96 bg-blue-600 rounded-full blur-[128px]" />
              <div className="absolute bottom-0 -right-10 w-96 h-96 bg-red-600 rounded-full blur-[128px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
              <div className="w-full lg:w-1/2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold uppercase tracking-widest mb-6">
                  <Activity className="w-4 h-4 text-blue-500" />
                  Our Mission
                </div>
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
                  Bridging the gap between{" "}
                  <span className="text-blue-500">Chaos</span> and{" "}
                  <span className="text-green-500">Care</span>.
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
                  <div className="flex flex-col gap-1 border-l-4 border-blue-500 pl-4">
                    <span className="text-2xl font-black">100%</span>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                      Digital Triage
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 transform translate-y-8">
                  <Siren className="w-10 h-10 text-red-500 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Rapid Dispatch</h4>
                  <p className="text-slate-400 text-sm">
                    Automated routing to the nearest available ambulance unit.
                  </p>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <HeartHandshake className="w-10 h-10 text-green-500 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Volunteer Net</h4>
                  <p className="text-slate-400 text-sm">
                    Crowdsourced first aid from trained locals nearby.
                  </p>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 transform translate-y-8">
                  {/* <Stethoscope className="w-10 h-10 text-purple-500 mb-4" /> */}
                  <h4 className="text-lg font-bold mb-2">Hospital Sync</h4>
                  <p className="text-slate-400 text-sm">
                    Real-time bed availability and patient intake data.
                  </p>
                </div>
                <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
                  <ShieldAlert className="w-10 h-10 text-orange-500 mb-4" />
                  <h4 className="text-lg font-bold mb-2">Crisis Mode</h4>
                  <p className="text-slate-400 text-sm">
                    Instant multi-agency alerts for mass casualty events.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How it Works Section */}
          <section className="py-24 bg-white relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-2xl mx-auto mb-20">
                <h2 className="text-4xl font-black text-slate-900 mb-4">
                  Every Second Counts
                </h2>
                <p className="text-slate-500 font-bold">
                  How QuickReach orchestrates a lifesaving response in 3 simple
                  steps.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-gradient-to-r from-red-100 via-blue-100 to-green-100 z-0" />

                {/* Step 1 */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center border-8 border-white shadow-xl mb-8">
                    <span className="text-4xl font-black text-red-600">1</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    You Signal for Help
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Press the Panic Button. We instantly capture your GPS
                    location and incident type (Medical, Fire, or Police).
                  </p>
                </div>

                {/* Step 2 */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center border-8 border-white shadow-xl mb-8">
                    <span className="text-4xl font-black text-blue-600">2</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    We Dispatch & Alert
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Our algorithm notifies the nearest ambulance and nearby
                    volunteers simultaneously.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center border-8 border-white shadow-xl mb-8">
                    <span className="text-4xl font-black text-green-600">
                      3
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">
                    Help Arrives
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    Track the response team in real-time. Hospitals are
                    pre-notified of your arrival for immediate care.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <footer className="w-full bg-slate-50 border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 font-bold text-sm">
            &copy; 2026 QuickReach Ethiopia. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              to="/first-aid"
              className="text-slate-500 hover:text-slate-900 text-sm font-bold"
            >
              First Aid Guide
            </Link>
            <Link
              to="/analytics"
              className="text-slate-500 hover:text-slate-900 text-sm font-bold"
            >
              Public Data
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
