import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { LayoutDashboard, Radio } from "lucide-react";

export const DispatcherLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleDispatcherLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      navigate("/dispatcher");
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
        <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Dispatcher Portal
        </h1>
        <p className="text-slate-400 mb-8">
          Secure Login
        </p>

        <form onSubmit={handleDispatcherLogin} className="space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Email Access ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none transition-all"
              placeholder="Email"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">
              Passcode
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-800 border-slate-700 text-white rounded-xl p-3 focus:ring-2 focus:ring-red-500 outline-none transition-all"
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all mt-4"
          >
            {loading ? "Authenticating..." : "Access Dashboard"}
          </button>
        </form>

        <p className="text-xs text-slate-500 mt-4 flex items-center justify-center gap-2">
          <Radio className="w-3 h-3 animate-pulse text-red-500" />
          Secure Channel Active
        </p>
      </div>
    </div>
  );
};
