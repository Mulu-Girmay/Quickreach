import React, { useState } from 'react';
import { Shield, ChevronRight, Heart, Droplets, Wind } from 'lucide-react';

const CONTENT = {
  en: {
    title: "First Aid Guide",
    subtitle: "Instant instructions while you wait for the ambulance.",
    categories: [
      {
        id: 'cpr',
        name: 'CPR (Heart Stop)',
        icon: <Heart className="w-6 h-6 text-red-500" />,
        steps: [
          "Check for breathing and pulse.",
          "Call for help immediately.",
          "Push hard and fast in the center of the chest.",
          "100-120 compressions per minute."
        ]
      },
      {
        id: 'bleeding',
        name: 'Bleeding Control',
        icon: <Droplets className="w-6 h-6 text-red-500" />,
        steps: [
          "Apply direct pressure with a clean cloth.",
          "Keep pressure until help arrives.",
          "Do not remove the cloth if it soaks through; add another on top."
        ]
      }
    ]
  },
  am: {
    title: "የመጀመሪያ እርዳታ መመሪያ",
    subtitle: "አምቡላንስ እስኪመጣ ድረስ የሚደረጉ ጥንቃቄዎች",
    categories: [
      {
        id: 'cpr',
        name: 'የልብ ምት (CPR)',
        icon: <Heart className="w-6 h-6 text-red-500" />,
        steps: [
          "መተንፈሱን እና የልብ ትርታውን ያረጋግጡ",
          "በፍጥነት የርዳታ ጥሪ ያድርጉ",
          "በደረቱ መካከል ላይ እጆቻችሁን አደራርባችሁ አጥብቃችሁ ጫኑ",
          "በደቂቃ ከ100-120 ጊዜ መጫን"
        ]
      }
    ]
  }
};

export const FirstAidPage = () => {
  const [lang, setLang] = useState('am');

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 font-sans">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Shield className="w-8 h-8 text-red-500" />
          <h1 className="text-2xl font-bold font-display tracking-tight">QuickReach</h1>
        </div>
        <button 
          onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
          className="bg-slate-800 px-4 py-2 rounded-full text-sm font-medium border border-slate-700 hover:bg-slate-700 transition-colors"
        >
          {lang === 'en' ? 'አማርኛ' : 'English'}
        </button>
      </div>

      <header className="mb-10">
        <h2 className="text-4xl font-extrabold mb-2 text-white/95">{CONTENT[lang].title}</h2>
        <p className="text-slate-400 text-lg leading-relaxed">{CONTENT[lang].subtitle}</p>
      </header>

      <div className="space-y-6">
        {CONTENT[lang].categories.map((cat) => (
          <div key={cat.id} className="bg-slate-800/50 backdrop-blur-xl border border-white/5 rounded-3xl p-6 hover:bg-slate-800 transition-all cursor-pointer group shadow-2xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-500/10 rounded-2xl">
                {cat.icon}
              </div>
              <h3 className="text-xl font-bold text-white/90">{cat.name}</h3>
              <ChevronRight className="ml-auto w-5 h-5 text-slate-500 group-hover:text-red-400 transition-colors" />
            </div>
            <ul className="space-y-3">
              {cat.steps.map((step, idx) => (
                <li key={idx} className="flex gap-3 text-slate-300 leading-snug">
                  <span className="text-red-500 font-bold shrink-0">{idx + 1}.</span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <footer className="mt-12 text-center text-slate-500 text-sm">
        <p>© 2026 QuickReach Emergency Response. Offline Access Enabled.</p>
      </footer>
    </div>
  );
};
