import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { Shield } from "lucide-react";

export const VolunteerLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleVolunteerLogin = async (e) => {
    e.preventDefault();
    if (isSignUp && !name.trim()) {
      alert("Please enter your name.");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp({
          email,
          password,
          role: "volunteer",
          name: name.trim(),
        });
        if (error) throw error;
        navigate("/volunteer");
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate("/volunteer");
      }
    } catch (error) {
      console.error("Auth failed:", error.message);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-8 h-8 text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Volunteer Access</h1>
        <p className="text-slate-400 mb-8">
          {isSignUp ? "Join the Network" : "First Responder Login"}
        </p>

        <form onSubmit={handleVolunteerLogin} className="space-y-4 text-left">
          {isSignUp && (
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                Full Name
              </label>
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
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Email"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all mt-4"
          >
            {loading
              ? "Connecting..."
              : isSignUp
                ? "Sign Up as Volunteer"
                : "Login"}
          </button>
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-xs text-slate-500 mt-6 hover:text-white transition-colors"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "New Volunteer? Sign Up Here"}
        </button>
      </div>
    </div>
  );
};
