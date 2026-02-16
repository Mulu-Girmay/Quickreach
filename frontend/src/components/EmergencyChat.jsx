import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Shield, MessageCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils'; // Assuming cn utility exists

export const EmergencyChat = ({ incidentId, senderType, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef();

  useEffect(() => {
    if (!incidentId) return;

    // Fetch existing messages
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('incident_messages')
        .select('*')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat_${incidentId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'incident_messages',
          filter: `incident_id=eq.${incidentId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = newMessage;
    setNewMessage('');

    const { error } = await supabase
      .from('incident_messages')
      .insert([
        { 
          incident_id: incidentId, 
          sender: senderType, 
          message: msg 
        }
      ]);

    if (error) console.error("Chat error:", error);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-24 right-6 w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col z-[100] animate-in slide-in-from-bottom-5 duration-300">
      {/* Header */}
      <div className="bg-slate-900 p-4 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-red-500" />
          <span className="text-xs font-black uppercase tracking-widest">Emergency Chat</span>
        </div>
        <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-lg">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[400px] bg-slate-50">
        {messages.length === 0 && (
          <p className="text-[10px] text-center text-slate-400 mt-10 font-bold uppercase tracking-tight">
            Encrypted Emergency Line Open...
          </p>
        )}
        {messages.map((m) => (
          <div 
            key={m.id} 
            className={cn(
              "flex flex-col max-w-[85%] animate-in fade-in zoom-in-95 duration-200",
              m.sender === senderType ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "p-3 rounded-2xl text-[11px] font-medium leading-relaxed shadow-sm",
              m.sender === senderType 
                ? "bg-red-600 text-white rounded-br-none" 
                : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
            )}>
              {m.message}
            </div>
            <span className="text-[8px] text-slate-400 mt-1 uppercase font-black">
              {m.sender === senderType ? 'You' : (m.sender === 'dispatcher' ? 'HQ Dispatch' : 'Citizen')}
            </span>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-slate-100 border-none rounded-xl px-3 py-2 text-xs focus:ring-1 ring-red-600 transition-all font-medium"
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
