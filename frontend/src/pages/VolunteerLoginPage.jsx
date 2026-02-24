import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Shield, ArrowLeft } from 'lucide-react';

export const VolunteerLoginPage = () => {
  const [email, setEmail] = useState('volunteer@quickreach.demo');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleVolunteerLogin = async (e) => {
    e.preventDefault();
    if (isSignUp && !name.trim()) {
      alert('Please enter your name.');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
         const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
               data: {
                  role: 'volunteer',
                  name: name.trim()
               }
            }
         });
         if (error) throw error;
         if (data.session) navigate('/volunteer');
      } else {
         const { error } = await supabase.auth.signInWithPassword({
            email,
            password
         });

         if (error) {
            if (error.message.includes('Invalid login credentials') && email.includes('demo')) {
                const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { role: 'volunteer', name: name.trim() || 'Demo Volunteer' } }
                });
                if (signUpError) throw signUpError;
                if (signUpData.session) navigate('/volunteer');
            } else {
                throw error;
            }
         } else {
            navigate('/volunteer');
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
      <Link to="/" className="fixed top-3 left-3 sm:top-6 sm:left-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors z-10">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-bold">Back to Home</span>
      </Link>
      <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Volunteer Access</h1>
        <p className="text-slate-400 mb-8">{isSignUp ? 'Join the Network' : 'First Responder Login'}</p>
        
        <form onSubmit={handleVolunteerLogin} className="space-y-4 text-left">
           {isSignUp && (
             <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Your name"
                />
             </div>
           )}
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="volunteer@email.com"
              />
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
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
             {loading ? 'Connecting...' : (isSignUp ? 'Sign Up as Volunteer' : 'Login')}
           </button>
        </form>

        <button 
           onClick={() => setIsSignUp(!isSignUp)}
           className="text-xs text-slate-500 mt-6 hover:text-white transition-colors"
        >
           {isSignUp ? 'Already have an account? Sign In' : 'New Volunteer? Sign Up Here'}
        </button>
      </div>
    </div>
  );
};
