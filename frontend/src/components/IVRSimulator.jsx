import React, { useState } from 'react';
import { Phone, Mic, Languages, X, Play, Volume2 } from 'lucide-react';

const IVR_FLOW = {
  initial: {
    en: "Welcome to QuickReach. For English, press 1. አማርኛ ለመጠቀም 2 ይጫኑ።",
    am: "እንኳን ወደ ኩዊክ ሪች በደህና መጡ። አማርኛ ለመጠቀም 2 ይጫኑ። For English, press 1."
  },
  menu: {
    en: "Press 1 for Medical, 2 for Fire, 3 for Police.",
    am: "ለህክምና 1 ይጫኑ፣ ለእሳት አደጋ 2 ይጫኑ፣ ለፖሊስ 3 ይጫኑ።"
  },
  confirm: {
    en: "Help is on the way. Stay on the line.",
    am: "እርዳታ እየመጣ ነው። እባክዎ መስመር ላይ ይቆዩ።"
  }
};

export const IVRSimulator = ({ isOpen, onClose }) => {
  const [step, setStep] = useState('initial');
  const [lang, setLang] = useState(null);
  const [isCalling, setIsCalling] = useState(false);

  if (!isOpen) return null;

  const startCall = () => setIsCalling(true);
  
  const handleInput = (input) => {
    if (step === 'initial') {
      if (input === '1') setLang('en');
      if (input === '2') setLang('am');
      setStep('menu');
    } else if (step === 'menu') {
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white">
          <X className="w-6 h-6" />
        </button>

        <div className="p-10 pt-20 text-center">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-900/20">
            <Phone className="w-10 h-10 text-white fill-white animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tighter">IVR Voice System</h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-8">Language: {lang ? lang.toUpperCase() : 'PENDING'}</p>

          {!isCalling ? (
            <button 
              onClick={startCall}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3"
            >
              <Play className="w-5 h-5 fill-white" />
              START VOICE LINK
            </button>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-800 p-6 rounded-3xl border border-white/5 min-h-[100px] flex items-center justify-center text-slate-300 font-bold italic leading-relaxed">
                "{IVR_FLOW[step][lang || 'en']}"
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((num) => (
                  <button 
                    key={num}
                    onClick={() => handleInput(num.toString())}
                    className="aspect-square bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-black text-xl flex items-center justify-center border border-white/5 active:scale-90 transition-all"
                  >
                    {num}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Recording Active</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
