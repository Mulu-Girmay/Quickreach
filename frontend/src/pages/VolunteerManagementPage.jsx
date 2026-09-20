import React, { useEffect, useState } from "react";
import { Check, Clock3, Mail, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { DispatcherSidebar } from "../components/DispatcherSidebar";

export function VolunteerManagementPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadVolunteers = async () => {
    try {
      setLoading(true);
      const payload = await apiFetch("/api/volunteers/pending");
      setVolunteers(payload.volunteers || []);
      setError("");
    } catch (err) {
      setError(err.message || "Could not load volunteer applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadVolunteers(); }, []);

  const updateApproval = async (id, approval_status) => {
    try {
      await apiFetch(`/api/volunteers/${id}/approval`, {
        method: "PATCH",
        body: { approval_status },
      });
      setVolunteers((current) => current.filter((volunteer) => volunteer._id !== id));
    } catch (err) {
      setError(err.message || "Could not update volunteer approval.");
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white"><DispatcherSidebar /><div className="min-w-0 flex-1 p-5 sm:p-8 lg:p-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-red-500">Volunteer operations</p>
            <h1 className="text-3xl font-black tracking-tight">Manage Volunteers</h1>
            <p className="mt-2 text-slate-400">Review applications and decide who can join the emergency response network.</p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-300">
            {volunteers.length} pending application{volunteers.length === 1 ? "" : "s"}
          </div>
        </div>

        {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}
        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-10 text-center text-slate-400">Loading volunteer applications...</div>
        ) : volunteers.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-16 text-center"><ShieldCheck className="mx-auto mb-4 h-10 w-10 text-emerald-400" /><h2 className="font-bold text-white">No pending applications</h2><p className="mt-2 text-sm text-slate-500">New volunteer registrations will appear here.</p></div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {volunteers.map((volunteer) => (
              <article key={volunteer._id} className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3"><div className="rounded-xl bg-red-500/10 p-3 text-red-400"><UserRound className="h-5 w-5" /></div><div><h2 className="font-bold text-white">{volunteer.name}</h2><p className="mt-1 flex items-center gap-1 text-xs uppercase tracking-wider text-amber-400"><Clock3 className="h-3 w-3" /> Pending approval</p></div></div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase text-amber-300">Volunteer</span>
                </div>
                <div className="mt-5 space-y-2 text-sm text-slate-400"><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-500" />{volunteer.email}</p>{volunteer.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-500" />{volunteer.phone}</p>}<p className="text-xs text-slate-500">Registered {new Date(volunteer.created_at).toLocaleString()}</p></div>
                <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={() => updateApproval(volunteer._id, "approved")} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-3 text-sm font-bold hover:bg-emerald-500"><Check className="h-4 w-4" /> Approve</button><button onClick={() => updateApproval(volunteer._id, "rejected")} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-3 text-sm font-bold text-red-300 hover:bg-red-950"><X className="h-4 w-4" /> Reject</button></div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div></div>
  );
}
