import React, { useState } from 'react';
import { AlertCircle, MapPin, Navigation, Phone, Shield, Languages, CheckCircle } from 'lucide-react';
import { ETHIOPIAN_HOSPITALS } from '../data/hospitals';
import { getDistance } from '../lib/utils';
import { IncidentMap } from '../components/IncidentMap';
import { supabase } from '../lib/supabase';
import { TRANSLATIONS } from '../data/translations';
import { useNotifications } from '../components/NotificationSystem';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const SuccessContent = ({ status, t, lang, nearestHospital, incidentId, onReset }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleRate = async (rate) => {
    setRating(rate);
    setSubmitted(true);
    
    // Save rating to Supabase
    try {
      await supabase
        .from('incidents')
        .update({ rating: rate })
        .eq('id', incidentId);
    } catch (err) {
      console.error("Rating error:", err);
    }
  };

  if (status === 'Resolved') {
    return (
      <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl text-center border-4 border-slate-800 animate-in zoom-in duration-500">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-2 uppercase">{t.resolved_title}</h2>
        <p className="text-slate-400 mb-6 font-bold">{t.resolved_msg}</p>
        
        {!submitted ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.feedback}</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  className={cn(
                    "text-2xl transition-all hover:scale-125",
                    rating >= star ? "text-yellow-400" : "text-slate-700"
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="animate-bounce text-green-500 font-black text-sm uppercase tracking-tighter">
            {lang === 'en' ? "Thank you for the feedback!" : "ለአስተያየትዎ እናመሰግናለን!"}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-green-600 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
        <Shield className="w-32 h-32" />
      </div>
      <div className="relative z-10 text-center">
        <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Navigation className="w-8 h-8 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black mb-2">
          {status === 'Dispatched' ? (lang === 'en' ? "HELP DISPATCHED!" : "እርዳታ ተልኳል!") : t.help_on_way}
        </h2>
        <p className="text-green-50 mb-6 font-bold leading-tight">
          {status === 'Dispatched' 
            ? (lang === 'en' ? "A team is officially on their way to your location." : "የአደጋ ጊዜ ሰራተኞች ወደ እርስዎ እየመጡ ነው።")
            : `${t.request_received} ${nearestHospital ? `${t.hospital_coming} ${nearestHospital.name}.` : t.connecting}`}
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 text-xs font-black bg-black/20 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20">
            <Phone className="w-4 h-4" />
            <span>{t.dispatcher_id}: #QD-{incidentId.slice(0, 5)}</span>
          </div>
          {status === 'Dispatched' && (
            <div className="animate-pulse-red bg-white text-red-600 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest shadow-xl">
              Live Response Active
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const PanicPage = () => {
  // ... state and handlers ...
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestHospital, setNearestHospital] = useState(null);
  const [incidentId, setIncidentId] = useState(null);
  const [status, setStatus] = useState('Pending');
  const [error, setError] = useState(null);
  const { addNotification } = useNotifications();

  const t = TRANSLATIONS[lang];

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'am' : 'en');
  };

  const handlePanic = async (type) => {
    setLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError(lang === 'en' ? "Geolocation is not supported." : "ጂፒኤስ በስልክዎ አይሰራም።");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = [latitude, longitude];
        setUserLocation(location);

        let minDistance = Infinity;
        let closest = null;

        ETHIOPIAN_HOSPITALS.forEach(hospital => {
          const dist = getDistance(latitude, longitude, hospital.lat, hospital.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closest = hospital;
          }
        });

        setNearestHospital(closest);

        try {
          const { data, error: sbError } = await supabase
            .from('incidents')
            .insert([
              { 
                type, 
                lat: latitude, 
                lng: longitude, 
                status: 'Pending',
                reporter_phone: 'Web User'
              }
            ])
            .select();

          if (sbError) throw sbError;
          if (data) {
            setIncidentId(data[0].id);
            // Start listening for status updates for THIS specific incident
            supabase
              .channel(`incident_${data[0].id}`)
              .on(
                'postgres_changes',
                { 
                  event: 'UPDATE', 
                  schema: 'public', 
                  table: 'incidents',
                  filter: `id=eq.${data[0].id}` 
                },
                (payload) => {
                  console.log("🔄 [PanicPage] Status Update Received:", payload.new.status);
                  if (payload.new.status === 'Dispatched') {
                    setStatus('Dispatched');
                    addNotification({
                      type: 'success',
                      title: 'HELP DISPATCHED',
                      message: 'A rescue unit is officially on the move to your location.'
                    });
                  } else if (payload.new.status === 'Resolved') {
                    setStatus('Resolved');
                    addNotification({
                      type: 'success',
                      title: 'SAFE & RESOLVED',
                      message: 'This emergency session has been marked as complete.'
                    });
                  }
                }
              )
              .subscribe((status) => {
                console.log("📣 [PanicPage] Subscription Status:", status);
              });
          }
        } catch (err) {
          console.error("Supabase Error:", err.message);
        }

        setLoading(false);
      },
      (err) => {
        setError(lang === 'en' ? "Please enable location services." : "እባክዎን የቦታ መገኛ (Location) ያብሩ።");
        setLoading(false);
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-4 pb-20">
      <header className="mb-8 relative">
        <div className="flex justify-center flex-col items-center">
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-2">
            <Shield className="text-red-600 w-8 h-8" />
            {t.title}
          </h1>
          <p className="text-slate-500 font-bold text-sm tracking-tight">{t.subtitle}</p>
        </div>
        
        <button 
          onClick={toggleLanguage}
          className="absolute top-0 right-0 p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-600 hover:text-red-600 transition-colors flex items-center gap-1 text-[10px] font-bold"
        >
          <Languages className="w-3 h-3" />
          {t.language}
        </button>
      </header>

      <main className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
        {!incidentId ? (
          <>
            <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border-4 border-white ring-1 ring-slate-100 text-center">
              <h2 className="text-2xl font-black text-slate-900 mb-2">{t.emergency_question}</h2>
              <p className="text-slate-500 mb-8 font-medium">{t.tap_below}</p>
              
              <div className="grid grid-cols-1 gap-5">
                <button
                  onClick={() => handlePanic('Medical')}
                  disabled={loading}
                  className={cn(
                    "group relative overflow-hidden flex flex-col items-center justify-center py-12 px-6 rounded-3xl transition-all active:scale-95 shadow-xl",
                    "bg-red-600 hover:bg-black text-white",
                    loading && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <AlertCircle className="w-16 h-16 mb-2 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="text-3xl font-black uppercase tracking-tighter">{t.medical}</span>
                  <span className="text-xs opacity-80 font-bold uppercase tracking-widest">{t.medical_desc}</span>
                </button>

                <button
                  onClick={() => handlePanic('Fire')}
                  disabled={loading}
                  className={cn(
                    "group relative overflow-hidden flex flex-col items-center justify-center py-12 px-6 rounded-3xl transition-all active:scale-95 shadow-xl",
                    "bg-orange-500 hover:bg-black text-white",
                    loading && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <Shield className="w-16 h-16 mb-2 animate-pulse group-hover:scale-110 transition-transform" />
                  <span className="text-3xl font-black uppercase tracking-tighter">{t.fire}</span>
                  <span className="text-xs opacity-80 font-bold uppercase tracking-widest">{t.fire_desc}</span>
                </button>
              </div>
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-2xl text-sm border border-red-100 font-bold">
                  {error}
                </div>
              )}
            </div>
            
            <div className="p-5 bg-black/5 rounded-2xl flex items-start gap-3 border border-black/5">
              <Navigation className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {t.location_shared}
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <SuccessContent 
              status={status} 
              t={t} 
              lang={lang} 
              nearestHospital={nearestHospital} 
              incidentId={incidentId} 
            />

            {status !== 'Resolved' && (
              <div className="bg-white p-2 rounded-3xl shadow-xl border-4 border-white ring-1 ring-slate-100 overflow-hidden h-[350px]">
                 <IncidentMap userLocation={userLocation} nearestHospital={nearestHospital} />
              </div>
            )}

            <button 
              onClick={() => { setIncidentId(null); setUserLocation(null); setNearestHospital(null); setStatus('Pending'); }}
              className="w-full py-4 bg-white rounded-2xl text-slate-500 font-black uppercase text-xs tracking-widest hover:text-red-600 transition-colors shadow-sm border border-slate-100"
            >
              {t.cancel}
            </button>
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <p>&copy; 2026 QuickReach Ethiopia</p>
      </footer>
    </div>
  );
};
