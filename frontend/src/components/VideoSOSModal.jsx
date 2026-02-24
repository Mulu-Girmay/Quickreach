import React from 'react';
import { X, PhoneOff, Video } from 'lucide-react';

export const VideoSOSModal = ({ onClose, roomName, displayName = 'QuickReach User' }) => {
  const safeRoom = String(roomName || '').trim();
  const jitsiRoom = encodeURIComponent(safeRoom);
  const jitsiName = encodeURIComponent(displayName);
  const src = `https://meet.jit.si/${jitsiRoom}#userInfo.displayName=%22${jitsiName}%22&config.prejoinPageEnabled=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="relative w-full h-full">
        <div className="absolute inset-x-0 top-0 p-4 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-center z-10">
          <div>
            <p className="text-white font-black tracking-tight">LIVE VIDEO CALL</p>
            <p className="text-xs text-white/70 font-mono uppercase tracking-wider">
              Room: {safeRoom || 'No Active Room'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/10 hover:bg-white/20 rounded-lg border border-white/20 text-white"
            title="Close video call"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {safeRoom ? (
          <iframe
            title="QuickReach Video Call"
            src={src}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-6 text-center">
              <Video className="w-8 h-8 text-white mx-auto mb-3" />
              <p className="text-white font-bold">No active incident room yet.</p>
              <p className="text-xs text-slate-400 mt-1">Start or select an incident to launch video.</p>
            </div>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/85 to-transparent flex justify-center z-10">
          <button
            onClick={onClose}
            className="p-4 rounded-full bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/40 transition-all active:scale-95 flex items-center justify-center"
            title="End call"
          >
            <PhoneOff className="w-6 h-6 text-white fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
