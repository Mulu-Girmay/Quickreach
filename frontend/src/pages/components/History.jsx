import React from "react";
import { CheckCircle } from "lucide-react";

export function History({ incidents, onSelect, getIncidentId }) {
  return (
    <section className="mt-6 border-t border-slate-800 pt-4">
      <div className="mb-3 flex items-center gap-3 px-2">
        <div className="h-px flex-1 bg-slate-800" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          History
        </span>
        <div className="h-px flex-1 bg-slate-800" />
      </div>
      <div className="space-y-2">
        {incidents.map((incident) => (
          <button
            key={getIncidentId(incident)}
            onClick={() => onSelect(incident)}
            className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-slate-800/20 p-3 text-left text-slate-500 hover:bg-slate-800/40"
          >
            <span className="flex items-center gap-3">
              <CheckCircle className="h-4 w-4 text-slate-600" />
              <span>
                <b className="block text-[10px] uppercase text-slate-400">
                  {incident.reporter_phone}
                </b>
                <small className="text-[8px] uppercase tracking-widest">
                  {incident.type} · Resolved
                </small>
              </span>
            </span>
            <span className="text-[8px]">
              {new Date(incident.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
