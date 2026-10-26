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
  const role = user?.role || "volunteer";
  return String(role).toLowerCase();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

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

  const refreshUser = async () => {
    const currentToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!currentToken) {
      setProfileLoading(false);
      return null;
    }
    try {
      setProfileLoading(true);
      const payload = await apiFetch("/api/auth/me");
      const freshUser = payload.user || payload.volunteer || null;
      if (freshUser) {
        setUser(freshUser);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(freshUser));
      }
      return freshUser;
    } catch (err) {
      // If unauthorized/expired token, clear session
      const message = String(err.message || "").toLowerCase();
      if (
        message.includes("401") ||
        message.includes("invalid token") ||
        message.includes("authentication required")
      ) {
        persistAuth(null, null);
      }
      // For network blips or offline, keep cached user
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const savedUser = localStorage.getItem(AUTH_USER_KEY);

    let parsedUser = null;
    if (savedUser) {
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        localStorage.removeItem(AUTH_USER_KEY);
      }
    }

    setToken(savedToken || null);
    setUser(parsedUser);
    setLoading(false);

    // If token exists, refresh profile in background once to verify validity and keep fresh
    if (savedToken) {
      refreshUser();
    }
  }, []);

  const signIn = async (email, password) => {
    const payload = await apiFetch("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    });

    const authenticatedUser = payload.user || payload.volunteer || null;
    persistAuth(payload.token, authenticatedUser);
    return { data: payload, error: null };
  };

  const signUp = async ({ email, password, name }) => {
    const payload = await apiFetch("/api/auth/register", {
      method: "POST",
      auth: false,
      body: { email, password, name },
    });

    const authenticatedUser = payload.user || payload.volunteer || null;
    persistAuth(payload.token, authenticatedUser);
    return { data: payload, error: null };
  };

  const signOut = async () => {
    persistAuth(null, null);
    return { error: null };
  };

  const value = useMemo(() => {
    return {
      loading,
      profileLoading,
      user,
      session: token ? { access_token: token, user } : null,
      role: normalizeRole(user),
      signIn,
      signUp,
      signOut,
      refreshUser,
    };
  }, [loading, profileLoading, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
