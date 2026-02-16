import React, { useState, useEffect, createContext, useContext } from 'react';
import { Bell, Info, AlertTriangle, CheckCircle, X, Play } from 'lucide-react';

const NotificationContext = createContext();

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);

  const playSound = () => {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.6;
    audio.play().then(() => {
      setIsAudioBlocked(false);
    }).catch(e => {
      console.warn("🔊 Audio blocked");
      setIsAudioBlocked(true);
    });
  };

  const addNotification = (notif) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { ...notif, id }]);
    playSound();
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      
      {isAudioBlocked && (
        <div className="fixed top-24 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
          <button 
            onClick={() => { playSound(); setIsAudioBlocked(false); }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-red-900/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all border border-red-500/30"
          >
            <Play className="w-3 h-3 fill-white" />
            Click to Enable Emergency Audio
          </button>
        </div>
      )}

      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-80">
        {notifications.map((n) => (
          <div 
            key={n.id}
            className={`
              p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right duration-300
              ${n.type === 'error' ? 'bg-red-900 border-red-800 text-white' : 
                n.type === 'success' ? 'bg-green-900 border-green-800 text-white' : 
                'bg-slate-900 border-slate-800 text-white'}
            `}
          >
            <div className={`
              shrink-0 p-1.5 rounded-lg
              ${n.type === 'error' ? 'bg-red-600' : 
                n.type === 'success' ? 'bg-green-600' : 
                'bg-blue-600'}
            `}>
              {n.type === 'error' ? <AlertTriangle className="w-4 h-4" /> :
               n.type === 'success' ? <CheckCircle className="w-4 h-4" /> :
               <Bell className="w-4 h-4" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider mb-0.5">{n.title}</p>
              <p className="text-[10px] font-medium opacity-80 leading-relaxed">{n.message}</p>
            </div>
            <button 
              onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
