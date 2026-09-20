import React from "react";
import { Clock, MapPin } from "lucide-react";
import { cn } from "../../lib/utils";

export function CurrentIncident({
  incidents,
  selectedIncidentId,
  onSelect,
  onActivate,
  getIncidentId,
  getLocationName,
}) {
  return (
    <section >
      <header className="border-b border-slate-800 bg-transparent px-2 py-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Current Incidents
          </h2>
          <div className="h-px flex-1 bg-slate-800" />
        </div>
      </header>
      <div className="space-y-3 p-4">
        {incidents.length === 0 ? (
          <p className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
            No active signals
          </p>
        ) : (
          incidents.map((incident) => {
            const id = getIncidentId(incident);
            return (
              <button
                key={id}
                onClick={() => onSelect(incident)}
                className={cn(
                  "w-full rounded-2xl border-2 bg-slate-800/40 p-3 text-left",
                  selectedIncidentId === id
                    ? "border-white bg-white text-slate-900"
                    : "border-slate-800 text-slate-300 hover:border-slate-700",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {incident.type}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] opacity-60">
                    <Clock className="h-3 w-3" />
                    {new Date(incident.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-2 font-black">{incident.reporter_phone}</p>
                <div className="mt-2 flex items-center justify-between text-[10px] font-bold">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {getLocationName(incident.lat, incident.lng) ||
                      "Location N/A"}
                  </span>
                  {incident.status === "Pending" && (
                    <span
                      onClick={(event) => {
                        event.stopPropagation();
                        onActivate(id);
                      }}
                      className="rounded-lg bg-red-600 px-2 py-1 text-white"
                    >
                      ACTIVATE
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
