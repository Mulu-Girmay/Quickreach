import React, { useState } from 'react';
import { AlertCircle, MapPin, Navigation, Phone, Shield } from 'lucide-react';
import { ETHIOPIAN_HOSPITALS } from '../data/hospitals';
import { getDistance } from '../lib/utils';
import { IncidentMap } from '../components/IncidentMap';
import { supabase } from '../lib/supabase';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const PanicPage = () => {
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [nearestHospital, setNearestHospital] = useState(null);
  const [incidentId, setIncidentId] = useState(null);
  const [error, setError] = useState(null);

  const handlePanic = async (type) => {
    setLoading(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const location = [latitude, longitude];
        setUserLocation(location);

        // Find nearest hospital
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

        // Report to Supabase
        try {
          const { data, error: sbError } = await supabase
            .from('incidents')
            .insert([
              { 
                type, 
                lat: latitude, 
                lng: longitude, 
                status: 'Pending',
                reporter_phone: 'User Device'
              }
            ])
            .select();

          if (sbError) throw sbError;
          if (data) setIncidentId(data[0].id);
        } catch (err) {
          console.error("Supabase Error:", err.message);
        }

        setLoading(false);
      },
      (err) => {
        setError("Please enable location services to use the Panic Button.");
        setLoading(false);
      }
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 p-4 pb-20">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
          <Shield className="text-red-600 w-8 h-8" />
          QuickReach
        </h1>
        <p className="text-slate-500 font-medium">Emergency Response System</p>
      </header>

      <main className="flex-1 flex flex-col gap-6 max-w-md mx-auto w-full">
        {!incidentId ? (
          <>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Emergency?</h2>
              <p className="text-slate-500 mb-8">Tap a button below to get immediate help.</p>
              
              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={() => handlePanic('Medical')}
                  disabled={loading}
                  className={cn(
                    "flex flex-col items-center justify-center py-10 px-6 rounded-2xl transition-all active:scale-95 shadow-lg",
                    "bg-red-600 hover:bg-red-700 text-white",
                    loading && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <AlertCircle className="w-12 h-12 mb-3 animate-pulse" />
                  <span className="text-2xl font-black uppercase tracking-wider">Medical</span>
                  <span className="text-sm opacity-80 mt-1">Ambulance & Hospital</span>
                </button>

                <button
                  onClick={() => handlePanic('Fire')}
                  disabled={loading}
                  className={cn(
                    "flex flex-col items-center justify-center py-10 px-6 rounded-2xl transition-all active:scale-95 shadow-lg",
                    "bg-orange-500 hover:bg-orange-600 text-white",
                    loading && "opacity-70 cursor-not-allowed"
                  )}
                >
                  <Shield className="w-12 h-12 mb-3 animate-pulse" />
                  <span className="text-2xl font-black uppercase tracking-wider">Fire</span>
                  <span className="text-sm opacity-80 mt-1">Fire Department</span>
                </button>
              </div>
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">
                  {error}
                </div>
              )}
            </div>
            
            <div className="p-4 bg-slate-200/50 rounded-xl flex items-start gap-3">
              <Navigation className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 italic">
                By clicking, your precise location will be shared with the nearest emergency dispatcher for immediate routing.
              </p>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-600 text-white p-6 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-white/20 p-2 rounded-full">
                  <Navigation className="w-6 h-6 animate-bounce" />
                </div>
                <h2 className="text-xl font-bold">Help is on the way!</h2>
              </div>
              <p className="text-green-50 mb-4 font-medium">
                Your emergency request has been received. {nearestHospital ? `Help is coming from ${nearestHospital.name}.` : 'Connecting to nearest dispatcher...'}
              </p>
              <div className="flex items-center gap-2 text-sm font-bold bg-black/10 p-3 rounded-lg border border-white/10">
                <Phone className="w-4 h-4" />
                <span>Dispatcher ID: #QD-{incidentId.slice(0, 5)}</span>
              </div>
            </div>

            <div className="bg-white p-2 rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
               <IncidentMap userLocation={userLocation} nearestHospital={nearestHospital} />
            </div>

            <button 
              onClick={() => { setIncidentId(null); setUserLocation(null); setNearestHospital(null); }}
              className="w-full py-4 text-slate-500 font-bold hover:text-slate-800 transition-colors"
            >
              Cancel Emergency / Done
            </button>
          </div>
        )}
      </main>

      <footer className="mt-8 text-center text-slate-400 text-xs py-4 px-6">
        <p>&copy; 2026 QuickReach Ethiopia. All rights reserved.</p>
      </footer>
    </div>
  );
};
