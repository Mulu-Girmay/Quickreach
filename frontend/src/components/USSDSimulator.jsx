import React, { useState, useEffect } from 'react';
import { Phone, X, Delete, PhoneCall, MessageSquare } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { supabase } from '../lib/supabase';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const USSDSimulator = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [ussdSession, setUssdSession] = useState(null); // null, 'MENU', 'PICK_LOCATION', 'CONFIRM', 'SUCCESS'
  const [emergencyType, setEmergencyType] = useState(null);
  const [subCity, setSubCity] = useState(null);
  const [sms, setSms] = useState(null);

  const handleKeypad = (val) => {
    if (ussdSession && !['MENU', 'PICK_LOCATION'].includes(ussdSession)) return;
    setInput(prev => prev + val);
  };

  const handleCall = () => {
    if (input === '*888#') {
      setUssdSession('MENU');
    } else {
      alert("Invalid USSD code. Try *888#");
    }
  };

  const handleMenuOption = (option) => {
    if (ussdSession === 'MENU') {
      if (option === '1') {
        setEmergencyType('Medical');
        setUssdSession('PICK_LOCATION');
      }
      if (option === '2') {
        setEmergencyType('Fire');
        setUssdSession('PICK_LOCATION');
      }
    }
  };

  const handleLocationOption = (option) => {
    const locations = { '1': 'Arada', '2': 'Bole', '3': 'Akaki', '4': 'Kolfe' };
    if (locations[option]) {
      setSubCity(locations[option]);
      setUssdSession('CONFIRM');
    }
  };

  const confirmEmergency = async () => {
    const type = emergencyType;
    
    // Coordinates based on sub-city (mocked)
    const locations = {
      'Arada': { lat: 9.035, lng: 38.751 },
      'Bole': { lat: 8.989, lng: 38.788 },
      'Akaki': { lat: 8.875, lng: 38.783 },
      'Kolfe': { lat: 9.031, lng: 38.705 }
    };

    const base = locations[subCity] || { lat: 9.0197, lng: 38.7469 };
    const lat = base.lat + (Math.random() - 0.5) * 0.01;
    const lng = base.lng + (Math.random() - 0.5) * 0.01;

    try {
      await supabase.from('incidents').insert([
        { 
          type, 
          lat, 
          lng, 
          status: 'Pending',
          reporter_phone: `USSD +251 (${subCity})`
        }
      ]);
    } catch (err) {
      console.error("USSD Supabase error:", err);
    }

    setUssdSession('SUCCESS');
    
    // Simulate SMS after 2 seconds
    setTimeout(() => {
      setSms(`QuickReach: Your ${type} emergency in ${subCity} has been logged. Help is arriving!`);
    }, 2000);
  };

  const reset = () => {
    setInput('');
    setUssdSession(null);
    setSms(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 group"
        >
          <Phone className="w-6 h-6" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-bold">
            USSD Simulator
          </span>
        </button>
      ) : (
        <div className="bg-slate-800 w-72 rounded-[32px] p-4 border-8 border-slate-700 shadow-2xl animate-in zoom-in duration-300">
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">QuickPhone Pro</div>
            <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Screen */}
          <div className="bg-[#94a3b8] aspect-[3/4] rounded-lg mb-6 p-4 flex flex-col items-center justify-center relative overflow-hidden">
            {ussdSession === null ? (
              <div className="text-3xl font-mono text-slate-800 tracking-tighter">{input || '0'}</div>
            ) : ussdSession === 'MENU' ? (
              <div className="w-full text-slate-900 font-mono text-sm">
                <p className="border-b border-slate-400 pb-1 mb-2 font-bold uppercase">QuickReach Menu</p>
                <button onClick={() => handleMenuOption('1')} className="block w-full text-left hover:bg-black/5 p-1">1. Medical</button>
                <button onClick={() => handleMenuOption('2')} className="block w-full text-left hover:bg-black/5 p-1">2. Fire</button>
                <button onClick={reset} className="block w-full text-left hover:bg-black/5 p-1 mt-2 text-xs">0. Cancel</button>
              </div>
            ) : ussdSession === 'PICK_LOCATION' ? (
              <div className="w-full text-slate-900 font-mono text-sm">
                <p className="border-b border-slate-400 pb-1 mb-2 font-bold uppercase">Select Location</p>
                <button onClick={() => handleLocationOption('1')} className="block w-full text-left hover:bg-black/5 p-1">1. Arada</button>
                <button onClick={() => handleLocationOption('2')} className="block w-full text-left hover:bg-black/5 p-1">2. Bole</button>
                <button onClick={() => handleLocationOption('3')} className="block w-full text-left hover:bg-black/5 p-1">3. Akaki</button>
                <button onClick={() => handleLocationOption('4')} className="block w-full text-left hover:bg-black/5 p-1">4. Kolfe</button>
              </div>
            ) : ussdSession === 'CONFIRM' ? (
              <div className="w-full text-slate-900 font-mono text-sm text-center">
                <p className="mb-4">Confirm {emergencyType} in {subCity}?</p>
                <div className="flex gap-2">
                  <button onClick={confirmEmergency} className="flex-1 bg-slate-900 text-white py-1 rounded">Yes</button>
                  <button onClick={() => setUssdSession('PICK_LOCATION')} className="flex-1 border border-slate-900 py-1 rounded">No</button>
                </div>
              </div>
            ) : (
              <div className="w-full text-slate-900 font-mono text-sm text-center">
                <p className="text-green-800 font-bold mb-2">Request Sent!</p>
                <div className="text-[10px] space-y-1">
                  <p>Type: <span className="font-bold">{emergencyType}</span></p>
                  <p>Area: <span className="font-bold">{subCity}</span></p>
                </div>
                <button onClick={reset} className="mt-4 text-[10px] underline">Back to Dial</button>
              </div>
            )}

            {/* SMS Notification UI Overlay */}
            {sms && (
              <div className="absolute top-0 left-0 w-full p-2 animate-in slide-in-from-top duration-500">
                <div className="bg-white rounded p-2 shadow-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-1 mb-1">
                    <MessageSquare className="w-3 h-3 text-blue-500" />
                    <span className="text-[8px] font-bold text-slate-500 uppercase">New Message</span>
                  </div>
                  <p className="text-[9px] text-slate-800 leading-tight line-clamp-2">{sms}</p>
                </div>
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((k) => (
              <button
                key={k}
                onClick={() => handleKeypad(k.toString())}
                className="bg-slate-700/50 hover:bg-slate-700 text-white font-bold py-2 rounded-full active:bg-slate-600 transition-colors"
              >
                {k}
              </button>
            ))}
            <div className="col-span-1"></div>
            <button 
              onClick={handleCall}
              className="bg-green-600 hover:bg-green-500 text-white py-2 rounded-full flex justify-center items-center shadow-lg active:scale-95 transition-transform"
            >
              <PhoneCall className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setInput(prev => prev.slice(0, -1))}
              className="bg-slate-600 hover:bg-slate-500 text-white py-2 rounded-full flex justify-center items-center active:scale-95 transition-transform"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
