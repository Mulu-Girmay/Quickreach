import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiFetch } from "../lib/api";

const AuthContext = createContext(null);

const AUTH_TOKEN_KEY = "quickreach_auth_token";
const AUTH_USER_KEY = "quickreach_auth_user";

function normalizeRole(user) {
  const role = user?.role || "citizen";
  return String(role).toLowerCase();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const savedUser = localStorage.getItem(AUTH_USER_KEY);

    setToken(savedToken || null);
    setUser(savedUser ? JSON.parse(savedUser) : null);
    setLoading(false);
  }, []);

  const persistAuth = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser || null);
    if (nextToken) {
      localStorage.setItem(AUTH_TOKEN_KEY, nextToken);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    if (nextUser) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  };

  const signIn = async (email, password) => {
    const payload = await apiFetch("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });

    persistAuth(payload.token, payload.user || payload.volunteer || null);
    return { data: payload, error: null };
  };

  const signUp = async ({ email, password, name, role = "citizen" }) => {
    const payload = await apiFetch("/api/auth/register", {
      method: "POST",
      auth: false,
      body: { email, password, name, role },
    });

    persistAuth(payload.token, payload.user || payload.volunteer || null);
    return { data: payload, error: null };
  };

  const signOut = async () => {
    persistAuth(null, null);
    return { error: null };
  };

  const value = useMemo(() => {
    return {
      loading,
      user,
      session: token ? { access_token: token, user } : null,
      role: normalizeRole(user),
      signIn,
      signUp,
      signOut,
    };
  }, [loading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
