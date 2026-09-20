import React, { useEffect, useState } from "react";
import { Hospital, MapPin, Pencil, Plus, Save, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { DispatcherSidebar } from "../components/DispatcherSidebar";

const emptyForm = { name: "", lat: "", lng: "", capacity: "", available_beds: "", contact: "" };

export function HospitalManagementPage() {
  const [hospitals, setHospitals] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  const loadHospitals = async () => {
    try { const payload = await apiFetch("/api/hospitals"); setHospitals(payload.hospitals || []); }
    catch (err) { setError(err.message || "Could not load hospitals."); }
  };
  useEffect(() => { loadHospitals(); }, []);

  const submit = async (event) => {
    event.preventDefault();
    try {
      const body = { ...form, lat: Number(form.lat), lng: Number(form.lng), capacity: form.capacity === "" ? undefined : Number(form.capacity), available_beds: form.available_beds === "" ? undefined : Number(form.available_beds) };
      await apiFetch(editingId ? `/api/hospitals/${editingId}` : "/api/hospitals", { method: editingId ? "PATCH" : "POST", body });
      setForm(emptyForm); setEditingId(null); setShowForm(false); setError(""); await loadHospitals();
    } catch (err) { setError(err.message || "Could not save hospital."); }
  };

  const edit = (hospital) => { setEditingId(hospital._id); setForm({ name: hospital.name || "", lat: hospital.lat ?? "", lng: hospital.lng ?? "", capacity: hospital.capacity ?? "", available_beds: hospital.available_beds ?? "", contact: hospital.contact || "" }); setShowForm(true); };
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return <div className="flex min-h-screen bg-slate-950 text-white"><DispatcherSidebar /><main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-12"><div className="mx-auto max-w-6xl">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-black uppercase tracking-[0.3em] text-red-500">Hospital operations</p><h1 className="text-3xl font-black">Manage Hospitals</h1><p className="mt-2 text-slate-400">Maintain facilities and bed availability for emergency routing.</p></div><button onClick={() => { setEditingId(null); setForm(emptyForm); setShowForm(true); }} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold hover:bg-red-500"><Plus className="h-4 w-4" /> Add hospital</button></div>
    {error && <p className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</p>}
    {showForm && <form onSubmit={submit} className="mb-6 rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-black">{editingId ? "Update hospital" : "Add hospital"}</h2><button type="button" onClick={() => setShowForm(false)}><X className="h-5 w-5 text-slate-500" /></button></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[["name","Hospital name","text"],["lat","Latitude","number"],["lng","Longitude","number"],["capacity","Total capacity","number"],["available_beds","Available beds","number"],["contact","Contact","text"]].map(([key, label, type]) => <label key={key} className="text-xs font-bold text-slate-400">{label}<input required={key === "name" || key === "lat" || key === "lng"} type={type} value={form[key]} onChange={(e) => update(key, e.target.value)} className="mt-1 w-full rounded-xl bg-slate-800 px-3 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-red-500" /></label>)}</div><button className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold hover:bg-emerald-500"><Save className="h-4 w-4" /> Save hospital</button></form>}
    <div className="grid gap-4 md:grid-cols-2">{hospitals.map((hospital) => { const capacity = Number(hospital.capacity || 0); const beds = Number(hospital.available_beds || 0); const percentage = capacity ? Math.max(0, Math.min(100, (beds / capacity) * 100)) : 0; return <article key={hospital._id} className="rounded-2xl border border-white/10 bg-slate-900 p-5"><div className="flex items-start justify-between"><div className="flex gap-3"><div className="rounded-xl bg-sky-500/10 p-3 text-sky-400"><Hospital className="h-5 w-5" /></div><div><h2 className="font-bold">{hospital.name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" /> {hospital.lat}, {hospital.lng}</p></div></div><button onClick={() => edit(hospital)} className="rounded-lg bg-slate-800 p-2 text-slate-400 hover:text-white"><Pencil className="h-4 w-4" /></button></div><div className="mt-5 flex justify-between text-sm"><span className="text-slate-400">Available beds</span><strong>{beds}{capacity ? ` / ${capacity}` : ""}</strong></div><div className="mt-2 h-2 rounded-full bg-slate-800"><div className={`h-2 rounded-full ${percentage < 20 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${percentage}%` }} /></div>{hospital.contact && <p className="mt-3 text-xs text-slate-500">Contact: {hospital.contact}</p>}</article>; })}</div>
    {!hospitals.length && <div className="rounded-2xl border border-white/10 bg-slate-900 p-12 text-center text-slate-500">No hospitals have been added yet.</div>}
  </div></main></div>;
}
