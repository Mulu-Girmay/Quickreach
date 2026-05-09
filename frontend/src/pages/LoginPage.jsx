import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthProvider";

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
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl border border-white/10"
      >
        <h1 className="text-2xl font-black mb-2">QuickReach Sign In</h1>
        <p className="text-slate-400 text-sm mb-6">
          Access role-protected dashboards.
        </p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full mb-3 bg-slate-700 px-4 py-3 rounded-xl outline-none"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full mb-3 bg-slate-700 px-4 py-3 rounded-xl outline-none"
        />
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        <button
          disabled={loading}
          className="w-full py-3 bg-red-600 rounded-xl font-bold"
        >
          {loading ? "Signing In..." : "Sign In"}
        </button>
        <Link
          to="/signup"
          className="block mt-3 text-center text-slate-400 text-sm hover:text-white"
        >
          New here? Create account
        </Link>
        <Link
          to="/panic"
          className="block mt-4 text-center text-slate-400 text-sm hover:text-white"
        >
          Continue to Citizen Mode
        </Link>
      </form>
    </div>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("citizen");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error: signupError } = await signUp({
      email,
      password,
      role,
    });

    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    setMessage("Account created and signed in.");
    const roleValue = String(role || "citizen").toLowerCase();
    setTimeout(() => {
      if (roleValue === "dispatcher" || roleValue === "admin") {
        navigate("/dispatcher");
      } else if (roleValue === "volunteer") {
        navigate("/volunteer");
      } else {
        navigate("/panic");
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-slate-800 p-8 rounded-3xl border border-white/10"
      >
        <h1 className="text-2xl font-black mb-2">Create Account</h1>
        <p className="text-slate-400 text-sm mb-6">
          Sign up for QuickReach access.
        </p>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full mb-3 bg-slate-700 px-4 py-3 rounded-xl outline-none"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8)"
          className="w-full mb-3 bg-slate-700 px-4 py-3 rounded-xl outline-none"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full mb-3 bg-slate-700 px-4 py-3 rounded-xl outline-none"
        >
          <option value="citizen">Citizen</option>
          <option value="volunteer">Volunteer</option>
          <option value="dispatcher">Dispatcher</option>
        </select>
        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
        {message && <p className="text-green-400 text-sm mb-3">{message}</p>}
        <button
          disabled={loading}
          className="w-full py-3 bg-blue-600 rounded-xl font-bold"
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
        <Link
          to="/login"
          className="block mt-4 text-center text-slate-400 text-sm hover:text-white"
        >
          Already have an account? Sign in
        </Link>
      </form>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-black mb-2">Unauthorized</h1>
        <p className="text-slate-400">
          Your account role does not have access to this dashboard.
        </p>
      </div>
    </div>
  );
}
