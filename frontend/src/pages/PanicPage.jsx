import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MapPin, Navigation, Phone, Shield, Languages, CheckCircle, MessageSquare, Video, ShieldAlert, Heart, X } from 'lucide-react';
import { ETHIOPIAN_HOSPITALS } from '../data/hospitals';
import { getDistance, cn } from '../lib/utils';
import { IncidentMap } from '../components/IncidentMap';
import { EmergencyChat } from '../components/EmergencyChat';
import { FirstAidGuide } from '../components/FirstAidGuide';
import { supabase } from '../lib/supabase';
import { TRANSLATIONS } from '../data/translations';
import { useNotifications } from '../components/NotificationSystem';

const PANIC_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2550/2550-preview.mp3'; // Urgent Beep Pulse
const DISPATCH_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2536/2536-preview.mp3'; // Smooth Dispatch Chirp

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFirstAidOpen, setIsFirstAidOpen] = useState(false);
  const [isVideoSOSOpen, setIsVideoSOSOpen] = useState(false);
  const { addNotification } = useNotifications();
  const panicAudioRef = useRef(new Audio(PANIC_SOUND_URL));
  const dispatchAudioRef = useRef(new Audio(DISPATCH_SOUND_URL));

  // Preload audio on first interaction
  useEffect(() => {
    const unlock = () => {
      panicAudioRef.current.load();
      dispatchAudioRef.current.load();
      window.removeEventListener('click', unlock);
    };
    window.addEventListener('click', unlock);
    return () => window.removeEventListener('click', unlock);
  }, []);

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
          const payload = { 
            type, 
            lat: latitude, 
            lng: longitude, 
            status: 'Pending',
            reporter_phone: 'Web User',
            triage_score: type === 'Fire' ? 10 : type === 'Medical' ? 9 : type === 'Police' ? 8 : 7
          };

          let { data, error: sbError } = await supabase
            .from('incidents')
            .insert([payload])
            .select();

          // Fallback: If triage_score column is missing, try again without it
          if (sbError && sbError.message.includes('triage_score')) {
            console.warn("⚠️ [PanicPage] triage_score column missing. Retrying basic insert...");
            const { triage_score, ...basicPayload } = payload;
            const retry = await supabase
              .from('incidents')
              .insert([basicPayload])
              .select();
            data = retry.data;
            sbError = retry.error;
          }

          if (sbError) throw sbError;
          if (data) {
            setIncidentId(data[0].id);
            panicAudioRef.current.currentTime = 0;
            panicAudioRef.current.play().catch(e => console.log("Audio play failed:", e));

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
                    dispatchAudioRef.current.currentTime = 0;
                    dispatchAudioRef.current.play().catch(e => console.log("Audio play failed:", e));
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
          setError(lang === 'en' 
            ? `Connection Error: ${err.message}. Please apply SQL migrations.` 
            : `የመረጃ ቋት ችግር፡ ${err.message}። እባክዎ SQL ሚግሬሽኑን ይጫኑ።`
          );
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
        {/* Progress & Action Bar */}
        {incidentId && (
          <div className="flex gap-2 animate-in slide-in-from-top-4 duration-500">
            <button 
              onClick={() => setIsFirstAidOpen(true)}
              className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <ShieldAlert className="w-4 h-4" />
              First Aid
            </button>
            <button 
              onClick={() => setIsVideoSOSOpen(true)}
              className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
            >
              <Video className="w-4 h-4 text-red-500" />
              Video SOS
            </button>
          </div>
        )}

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

      {/* Floating Chat Button */}
      {incidentId && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-90 transition-all z-40 border-4 border-white"
        >
          <MessageSquare className="w-6 h-6" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      <EmergencyChat 
        incidentId={incidentId} 
        senderType="citizen" 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
      />

      <FirstAidGuide 
        isOpen={isFirstAidOpen} 
        onClose={() => setIsFirstAidOpen(false)} 
      />

      {/* Simulated Video SOS Overlay */}
      {isVideoSOSOpen && (
        <div className="fixed inset-0 z-[110] bg-black animate-in fade-in duration-500 flex flex-col">
          <div className="absolute top-10 left-6 text-white z-20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Live Encrypted Link</span>
            </div>
            <h2 className="text-xl font-black italic tracking-tighter">THERMAL SOS STREAM</h2>
          </div>
          
          <button 
            onClick={() => setIsVideoSOSOpen(false)}
            className="absolute top-10 right-6 z-20 bg-white/10 p-3 rounded-full text-white hover:bg-white/20"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Visual Simulation */}
          <div className="flex-1 bg-gradient-to-br from-slate-900 via-red-950/20 to-slate-900 opacity-60 flex items-center justify-center">
             <div className="relative text-center">
                <div className="flex gap-2 justify-center mb-4">
                   {[...Array(4)].map((_, i) => <div key={i} className="w-1 h-12 bg-red-500/20 rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
                </div>
                <p className="text-red-500 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Syncing Visuals...</p>
             </div>
          </div>
          
          <div className="p-8 bg-slate-900/80 backdrop-blur-xl border-t border-white/5">
             <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest text-center mb-4">Dispatcher is viewing your camera to assess severity</p>
             <button 
              onClick={() => setIsVideoSOSOpen(false)}
              className="w-full py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-900/40"
             >
               End Stream
             </button>
          </div>
        </div>
      )}

      <footer className="mt-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <button 
          onClick={() => alert("SOS Alert sent to your saved Emergency Contacts! 📱")}
          className="mb-6 mx-auto bg-slate-200 text-slate-600 px-4 py-2 rounded-full hover:bg-red-100 hover:text-red-600 transition-all border border-slate-300"
        >
          Notify Family & Friends (SOS)
        </button>
        <p>&copy; 2026 QuickReach Ethiopia</p>
        <div className="mt-4 flex justify-center gap-4">
          <Link to="/volunteer" className="text-blue-600 hover:underline">Community Volunteer Mode</Link>
          <span className="text-slate-300">|</span>
          <Link to="/first-aid" className="text-slate-500 hover:underline">Offline First Aid Guide</Link>
        </div>
      </footer>
    </div>
  );
};
