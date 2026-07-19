import React, { useEffect, useState } from "react";
import { UserCheck, X, Check, Ban } from "lucide-react";
import { apiFetch } from "../lib/api";

export const PendingVolunteersPanel = ({ isOpen, onClose, onCountChange }) => {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actingOnId, setActingOnId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const payload = await apiFetch("/api/volunteers/pending");
      const list = payload.volunteers || [];
      setVolunteers(list);
      onCountChange?.(list.length);
    } catch (error) {
      console.error("Failed to load pending volunteers:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const decide = async (id, approval_status) => {
    setActingOnId(id);
    try {
      await apiFetch(`/api/volunteers/${id}/approval`, {
        method: "PATCH",
        body: { approval_status },
      });
      const remaining = volunteers.filter((v) => (v.id || v._id) !== id);
      setVolunteers(remaining);
      onCountChange?.(remaining.length);
    } catch (error) {
      console.error("Failed to update approval:", error.message);
      alert(error.message || "Could not update volunteer approval.");
    } finally {
      setActingOnId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-black text-white tracking-tight">
              Pending Volunteer Approvals
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <p className="text-slate-500 text-sm text-center py-8">
              Loading...
            </p>
          )}
          {!loading && volunteers.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">
              No volunteers awaiting approval.
            </p>
          )}
          {volunteers.map((v) => {
            const id = v.id || v._id;
            return (
              <div
                key={id}
                className="bg-slate-800/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold text-white truncate">{v.name}</p>
                  <p className="text-xs text-slate-400 truncate">{v.email}</p>
                  {v.created_at && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Registered {new Date(v.created_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => decide(id, "approved")}
                    disabled={actingOnId === id}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-xl disabled:opacity-50"
                    title="Approve"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => decide(id, "rejected")}
                    disabled={actingOnId === id}
                    className="bg-slate-700 hover:bg-red-700 text-white p-2 rounded-xl disabled:opacity-50"
                    title="Reject"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
