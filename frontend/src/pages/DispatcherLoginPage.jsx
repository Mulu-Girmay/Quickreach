import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Radio } from 'lucide-react';

export const DispatcherLoginPage = () => {
  const [email, setEmail] = useState('dispatcher@quickreach.demo');
  const [password, setPassword] = useState('password123');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDispatcherLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
         // Sign Up Flow
         const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
               data: {
                  role: 'dispatcher',
                  name: 'Dispatcher ' + Math.floor(Math.random() * 1000)
               }
            }
         });
         if (error) throw error;
         if (data.session) navigate('/dispatcher');
      } else {
         // Login Flow
         const { error } = await supabase.auth.signInWithPassword({
            email,
            password
         });

         if (error) {
           // Auto-fallback to signup for demo convenience if user not found
            if (error.message.includes('Invalid login credentials') && email.includes('demo')) {
                console.log("Demo user not found, auto-creating...");
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { role: 'dispatcher', name: 'HQ Commander' } }
                });
                if (signUpError) throw signUpError;
                if (signUpData.session) navigate('/dispatcher');
            } else {
                throw error;
            }
         } else {
            navigate('/dispatcher');
         }
      }
    } catch (error) {
      console.error('Auth failed:', error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Dispatcher Portal</h1>
        <p className="text-slate-400 mb-8">{isSignUp ? 'Create Command Account' : 'Secure Login'}</p>
        
        <form onSubmit={handleDispatcherLogin} className="space-y-4 text-left">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email Access ID</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="dispatcher@id.com"
              />
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Passcode</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="••••••"
              />
           </div>
           
           <button 
             type="submit"
             disabled={loading}
             className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all mt-4"
           >
             {loading ? 'Authenticating...' : (isSignUp ? 'Register Terminal' : 'Access Dashboard')}
           </button>
        </form>

        <button 
           onClick={() => setIsSignUp(!isSignUp)}
           className="text-xs text-slate-500 mt-6 hover:text-white transition-colors"
        >
           {isSignUp ? 'Already have credentials? Sign In' : 'Need authorization? Create Account'}
        </button>

        
        <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-2">
          <Radio className="w-3 h-3 animate-pulse text-green-500" />
          Secure Channel Active
        </p>
      </div>
    </div>
  );
};
