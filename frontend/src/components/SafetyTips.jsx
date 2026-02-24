import React from 'react';
import { AlertTriangle, Heart, Flame, Shield, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';

const SAFETY_TIPS = {
  Medical: {
    icon: Heart,
    color: 'red',
    tips: [
      { title: 'Stay Calm', desc: 'Take slow, deep breaths. Panic can worsen your condition.' },
      { title: 'Stay Put', desc: 'Remain in your current location so responders can find you easily.' },
      { title: 'Stop Bleeding', desc: 'Apply direct pressure to any wounds with clean cloth.' },
      { title: 'Keep Warm', desc: 'Cover yourself with blankets or clothing to prevent shock.' },
      { title: 'No Food/Water', desc: 'Avoid eating or drinking if you have severe injuries.' },
      { title: 'Monitor Breathing', desc: 'If breathing is difficult, sit upright and loosen tight clothing.' }
    ]
  },
  Fire: {
    icon: Flame,
    color: 'orange',
    tips: [
      { title: 'Get Low', desc: 'Smoke rises. Stay close to the ground where air is clearer.' },
      { title: 'Feel Doors', desc: 'Before opening, touch door with back of hand. If hot, find another exit.' },
      { title: 'Close Doors', desc: 'Close doors behind you to slow fire spread.' },
      { title: 'Stop, Drop, Roll', desc: 'If clothes catch fire, stop moving, drop to ground, and roll.' },
      { title: 'Never Go Back', desc: 'Once outside, never return inside for any reason.' },
      { title: 'Meet Responders', desc: 'Go to a safe distance and wait for fire department.' }
    ]
  }
};

export const SafetyTips = ({ incidentType, status }) => {
  const tips = SAFETY_TIPS[incidentType] || SAFETY_TIPS.Medical;
  const Icon = tips.icon;
  const isDispatched = status === 'Dispatched';

  return (
    <div className={cn(
      "bg-gradient-to-br rounded-2xl p-6 border-2 shadow-lg",
      tips.color === 'red' 
        ? "from-red-50 to-pink-50 border-red-200" 
        : "from-orange-50 to-yellow-50 border-orange-200"
    )}>
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "p-2 rounded-xl",
          tips.color === 'red' ? "bg-red-500" : "bg-orange-500"
        )}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-black text-slate-900">Safety Tips</h3>
          <p className={cn(
            "text-xs font-bold",
            tips.color === 'red' ? "text-red-600" : "text-orange-600"
          )}>
            {incidentType} Emergency • {isDispatched ? 'Help En Route' : 'Awaiting Response'}
          </p>
        </div>
      </div>

      {isDispatched && (
        <div className="bg-green-100 border border-green-300 rounded-xl p-3 mb-4 flex items-start gap-2">
          <Shield className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-green-800 text-sm">Help is on the way!</p>
            <p className="text-xs text-green-700">Follow these tips while waiting for responders.</p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {tips.tips.map((tip, idx) => (
          <div key={idx} className="flex items-start gap-3 bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-white/40">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs",
              tips.color === 'red' 
                ? "bg-red-500 text-white" 
                : "bg-orange-500 text-white"
            )}>
              {idx + 1}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-slate-900 text-sm">{tip.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{tip.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700">
          <span className="font-bold">Remember:</span> Your safety is the priority. 
          Don't put yourself in more danger trying to help others.
        </p>
      </div>
    </div>
  );
};
