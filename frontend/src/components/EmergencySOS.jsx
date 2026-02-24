import React, { useState } from 'react';
import { AlertTriangle, X, Phone } from 'lucide-react';
import { apiFetch } from '../lib/api';

export const EmergencySOS = ({ volunteerId, onSOSTriggered }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const triggerSOS = async () => {
    setIsSending(true);
    try {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
          await apiFetch('/api/incidents/public', {
            method: 'POST',
            body: {
              phone: volunteerId || 'VOLUNTEER_SOS',
              type: 'Medical',
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              reporter_phone: volunteerId || 'VOLUNTEER_SOS'
            }
          });
          onSOSTriggered?.();
          setIsConfirming(false);
          setIsSending(false);
          alert('Emergency SOS sent! Help is on the way.');
        } catch (error) {
          console.error('SOS send failed:', error);
          alert(error.message || 'Failed to send SOS. Please try again.');
          setIsSending(false);
        }
      }, (error) => {
        console.error('GPS error:', error);
        alert('Could not get location. Please enable GPS.');
        setIsSending(false);
      });
    } catch (error) {
      console.error('SOS trigger failed:', error);
      alert(error.message || 'Failed to send SOS');
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirming(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-4 rounded-full shadow-2xl hover:shadow-red-500/50 transition-all hover:scale-110 animate-pulse"
        title="Emergency SOS - Trigger if you need help"
      >
        <AlertTriangle className="w-8 h-8" />
      </button>

      {isConfirming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-500 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-red-600 p-3 rounded-xl animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white">Emergency SOS</h2>
              </div>
              <button onClick={() => setIsConfirming(false)} className="text-red-300 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="bg-red-950/50 border border-red-500/30 rounded-2xl p-4 mb-6">
              <p className="text-white font-bold mb-2">⚠️ You are about to trigger an emergency alert!</p>
              <p className="text-red-200 text-sm">
                This will immediately notify dispatchers and send your current location. 
                Only use this if you are in danger or need urgent assistance.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setIsConfirming(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={triggerSOS}
                disabled={isSending}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Phone className="w-5 h-5" />
                {isSending ? 'Sending...' : 'Send SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
