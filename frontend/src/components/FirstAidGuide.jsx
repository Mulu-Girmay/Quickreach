import React from 'react';
import { X, Heart, Wind, Droplets, Flame, Zap, ShieldAlert } from 'lucide-react';
import { cn } from '../lib/utils';

const GUIDES = [
  { 
    id: 'cpr', 
    title: 'Adult CPR', 
    icon: <Heart className="w-5 h-5 text-red-500" />, 
    steps: ['Push hard/fast on center of chest', '100-120 beats per minute', 'Allow chest to recoil fully'] 
  },
  { 
    id: 'bleeding', 
    title: 'Stop Bleeding', 
    icon: <Droplets className="w-5 h-5 text-blue-500" />, 
    steps: ['Apply firm, direct pressure', 'Use clean cloth or bandage', 'Do not remove soaked cloth'] 
  },
  { 
    id: 'choking', 
    title: 'Choking (Heimlich)', 
    icon: <Wind className="w-5 h-5 text-green-500" />, 
    steps: ['Stand behind the person', 'Give 5 quick abdominal thrusts', 'Repeat until object is out'] 
  },
  { 
    id: 'burns', 
    title: 'Severe Burns', 
    icon: <Flame className="w-5 h-5 text-orange-500" />, 
    steps: ['Cool with running water', 'Do not apply ice or ointments', 'Cover with loose, sterile dressing'] 
  }
];

export const FirstAidGuide = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl p-8 pb-12 animate-in slide-in-from-bottom duration-500">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">SOS Life Support</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full text-slate-400 hover:text-red-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {GUIDES.map((guide) => (
            <div key={guide.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-red-500/30 transition-all">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  {guide.icon}
                </div>
                <h3 className="font-black text-slate-800 uppercase tracking-wide">{guide.title}</h3>
              </div>
              <ul className="space-y-2 ml-12">
                {guide.steps.map((step, i) => (
                  <li key={i} className="text-xs text-slate-500 font-medium flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-1 shrink-0" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all"
        >
          I Understand, Return to Map
        </button>
      </div>
    </div>
  );
};
