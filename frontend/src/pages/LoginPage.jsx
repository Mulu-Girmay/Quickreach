import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";
import { ShieldAlert, HeartHandshake, Shield, AlertTriangle } from "lucide-react";

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="mb-2 flex items-center gap-2">
          <div className="rounded-xl bg-red-600/20 p-2 border border-red-500/30 text-red-500">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <span className="text-xs font-black tracking-widest text-red-500 uppercase">
            QuickReach
          </span>
        </div>
        <h1 className="text-2xl font-black mb-1">{title}</h1>
        <p className="text-slate-400 text-xs mb-6">{subtitle}</p>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: authError, data } = await signIn(email, password);
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    const role = String(
      data?.user?.role || data?.volunteer?.role || "citizen",
    ).toLowerCase();
    if (role === "dispatcher" || role === "admin") {
      navigate("/dispatcher");
    } else if (role === "volunteer") {
      navigate("/volunteer");
    } else {
      navigate("/panic");
    }
  };

  return (
    <AuthShell
      title="Authorized Sign In"
      subtitle="Access role-protected dispatch and responder dashboards."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@quickreach.com"
            className="w-full bg-slate-800 border border-white/10 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-slate-500 focus:border-red-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full bg-slate-800 border border-white/10 px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-slate-500 focus:border-red-500"
          />
        </div>

        {error && <p className="text-red-400 text-xs pt-1">{error}</p>}

        <button
          disabled={loading}
          className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-sm text-white transition-colors shadow-lg shadow-red-900/30 disabled:opacity-50 mt-2"
        >
          {loading ? "Signing In..." : "Sign In to Operations"}
        </button>

        <div className="pt-4 border-t border-white/10 space-y-2.5 text-center text-xs">
          <Link
            to="/volunteer-login"
            className="block text-slate-300 hover:text-white transition-colors font-medium"
          >
            Volunteer First Responder? <span className="text-red-400 font-bold underline">Join or Sign In</span>
          </Link>
          <Link
            to="/dispatcher-login"
            className="block text-slate-400 hover:text-white transition-colors"
          >
            Dispatcher Operations Portal
          </Link>
          <div className="pt-2">
            <Link
              to="/panic"
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-600/10 border border-red-500/20 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-600/20 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Reporting an Emergency? No account needed</span>
            </Link>
          </div>
        </div>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const navigate = useNavigate();

  return (
    <AuthShell
      title="Public Signup Disabled"
      subtitle="Citizens do not need an account to report emergencies."
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-slate-800/80 p-4 text-xs text-slate-300 space-y-2">
          <p>
            QuickReach does not require citizen registration. You can report an emergency, send your GPS location, and communicate with dispatchers immediately without creating an account.
          </p>
          <p className="text-slate-400">
            If you want to join our certified network of first responders, you can register as a volunteer responder.
          </p>
        </div>

        <button
          onClick={() => navigate("/panic")}
          className="w-full py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs uppercase tracking-wider text-white transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Report Emergency (No Account Needed)</span>
        </button>

        <button
          onClick={() => navigate("/volunteer-login")}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-200 transition-colors flex items-center justify-center gap-2"
        >
          <HeartHandshake className="h-4 w-4 text-red-400" />
          <span>Apply as Volunteer Responder</span>
        </button>

        <Link
          to="/login"
          className="block text-center text-slate-400 text-xs hover:text-white pt-2"
        >
          Already have an authorized staff account? Sign in
        </Link>
      </div>
    </AuthShell>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black mb-2 text-white">Access Restricted</h1>
        <p className="text-slate-400 text-xs mb-6">
          Your account role does not have authorization to view this operations dashboard.
        </p>
        <Link
          to="/"
          className="inline-block rounded-xl bg-slate-800 px-6 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
