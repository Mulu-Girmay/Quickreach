import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, X } from "lucide-react";
import { cn } from "../lib/utils"; // Assuming cn utility exists
import { apiFetch } from "../lib/api";
import { connectSocket } from "../lib/socket";

export const EmergencyChat = ({
  incidentId,
  senderType,
  isOpen,
  onClose,
  requireAuth = true,
  publicIncidentToken = null,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef();
  const incidentToken = publicIncidentToken || incidentId;

  useEffect(() => {
    if (!incidentId) return;

    const fetchMessages = async () => {
      try {
        const payload = await apiFetch(`/api/messages/${incidentId}`, {
          auth: requireAuth,
          headers:
            !requireAuth && incidentToken
              ? { "x-incident-token": incidentToken }
              : undefined,
        });
        setMessages(payload.messages || []);
      } catch (error) {
        console.error("Fetch chat failed:", error.message);
      }
    };

    fetchMessages();
    const socket = connectSocket();
    const handleIncomingMessage = (message) => {
      if (!message) return;
      const messageIncidentId = String(
        message.incident_id || message.incidentId || "",
      );
      if (messageIncidentId !== String(incidentId)) return;

      const messageId = message.id || message._id;
      setMessages((prev) => {
        if (
          messageId &&
          prev.some((item) => (item.id || item._id) === messageId)
        ) {
          return prev;
        }
        return [...prev, message];
      });
    };

    socket.on(`message-${incidentId}`, handleIncomingMessage);

    return () => {
      socket.off(`message-${incidentId}`, handleIncomingMessage);
    };
  }, [incidentId, requireAuth, publicIncidentToken]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = newMessage;
    setNewMessage("");

    try {
      await apiFetch("/api/messages", {
        method: "POST",
        auth: requireAuth,
        headers:
          !requireAuth && incidentToken
            ? { "x-incident-token": incidentToken }
            : undefined,
        body: { incident_id: incidentId, sender: senderType, message: msg },
      });
    } catch (error) {
      console.error("Chat error:", error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-2rem)] max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-black uppercase tracking-widest">
            Emergency Chat
          </span>
        </div>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[400px] bg-slate-50">
        {messages.length === 0 && (
          <p className="text-[10px] text-center text-slate-400 mt-10 font-bold uppercase tracking-tight">
            Encrypted Emergency Line Open...
          </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={m.id || m._id || idx}
            className={cn(
              "flex flex-col max-w-[88%] animate-in fade-in zoom-in-95 duration-200",
              m.sender === senderType
                ? "ml-auto items-end"
                : "mr-auto items-start",
            )}
          >
            <div
              className={cn(
                "px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-medium leading-relaxed shadow-sm",
                m.sender === senderType
                  ? "bg-red-600 text-white rounded-br-none"
                  : "bg-white text-slate-800 border border-slate-200 rounded-bl-none",
              )}
            >
              {m.message}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
              <span>
                {m.sender === senderType
                  ? "You"
                  : m.sender === "dispatcher"
                    ? "HQ Dispatch"
                    : "Citizen"}
              </span>
              <span>•</span>
              <span>
                {new Date(m.created_at || Date.now()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 border-none rounded-xl px-3 py-2.5 text-sm focus:ring-1 ring-red-600 transition-all font-medium"
        />
        <button
          type="submit"
          className="bg-red-600 text-white p-2 rounded-xl hover:bg-red-700 active:scale-90 transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
