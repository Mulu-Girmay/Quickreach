import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { DispatcherSidebar } from "../components/DispatcherSidebar";
import { VolunteerManagementTab } from "./components/VolunteerManagementTab";

export function VolunteerManagementPage() {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadVolunteers = async () => {
    try {
      setLoading(true);
      const payload = await apiFetch("/api/volunteers");
      setVolunteers(payload.volunteers || []);
    } catch (err) {
      console.error("Could not load volunteers:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolunteers();
  }, []);

  const updateApproval = async (id, approval_status) => {
    try {
      const res = await apiFetch(`/api/volunteers/${id}/approval`, {
        method: "PATCH",
        body: { approval_status },
      });
      setVolunteers((prev) =>
        prev.map((v) =>
          v._id === id
            ? {
                ...v,
                approval_status,
                is_online: approval_status === "approved" ? v.is_online : false,
              }
            : v,
        ),
      );
      return res;
    } catch (err) {
      console.error("Could not update volunteer approval:", err.message);
      throw err;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-white font-sans">
      <DispatcherSidebar />
      <main className="min-w-0 flex-1 flex flex-col h-screen overflow-hidden">
        <VolunteerManagementTab
          volunteers={volunteers}
          loading={loading}
          onUpdateApproval={updateApproval}
          onRefresh={loadVolunteers}
          onLocateOnMap={() => navigate("/incidents")}
          onSelectIncident={() => navigate("/incidents")}
        />
      </main>
    </div>
  );
}
