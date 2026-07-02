import React, { useEffect, createContext, useContext, useState } from "react";
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  BellRing,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { useAuth } from "./AuthProvider";

const NotificationContext = createContext();

const NOTIFICATION_SOUND_URL =
  "https://assets.mixkit.co/active_storage/sfx/2857/2857-preview.mp3";
const ELIGIBLE_PUSH_ROLES = new Set(["volunteer", "dispatcher", "admin"]);

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

export const NotificationProvider = ({ children }) => {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isAudioBlocked, setIsAudioBlocked] = useState(false);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState("");

  const playSound = () => {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.6;
    audio
      .play()
      .then(() => {
        setIsAudioBlocked(false);
      })
      .catch(() => {
        console.warn("🔊 Audio blocked");
        setIsAudioBlocked(true);
      });
  };

  const addNotification = (notif) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { ...notif, id }]);
    playSound();
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const refreshPushState = async () => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setIsPushSupported(false);
      return;
    }

    setIsPushSupported(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.getSubscription();
      setIsPushEnabled(Boolean(subscription));
      if (subscription) {
        setPushMessage("Emergency push alerts enabled.");
      }
    } catch (error) {
      console.error("Push setup check failed:", error);
      setPushMessage("Browser push is unavailable right now.");
    }
  };

  useEffect(() => {
    if (!user || !ELIGIBLE_PUSH_ROLES.has(String(role || "").toLowerCase())) {
      setIsPushSupported(false);
      setIsPushEnabled(false);
      return;
    }

    refreshPushState();
  }, [user, role]);

  const enablePushAlerts = async () => {
    if (!isPushSupported) {
      setPushMessage("This browser does not support push notifications.");
      return;
    }

    setIsPushLoading(true);
    setPushMessage("");

    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();

      if (permission !== "granted") {
        setPushMessage("Push permission was not granted.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const { publicKey } = await apiFetch("/api/push/vapid-public-key", {
        auth: false,
      });

      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await apiFetch("/api/push/subscribe", {
        method: "POST",
        body: { subscription: subscription.toJSON() },
      });

      setIsPushEnabled(true);
      setPushMessage("Emergency push alerts enabled.");
    } catch (error) {
      console.error("Enable push failed:", error);
      setPushMessage(error.message || "Unable to enable push alerts.");
    } finally {
      setIsPushLoading(false);
    }
  };

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}

      {isAudioBlocked && (
        <div className="fixed top-24 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
          <button
            onClick={() => {
              playSound();
              setIsAudioBlocked(false);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg shadow-red-900/40 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all border border-red-500/30"
          >
            <Play className="w-3 h-3 fill-white" />
            Click to Enable Emergency Audio
          </button>
        </div>
      )}

      {user &&
        ELIGIBLE_PUSH_ROLES.has(String(role || "").toLowerCase()) &&
        isPushSupported &&
        !isPushEnabled && (
          <div className="fixed top-40 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
            <button
              onClick={enablePushAlerts}
              disabled={isPushLoading}
              className="bg-red-600 text-white px-4 py-3 rounded-2xl shadow-lg shadow-red-900/30 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all border border-red-500/30 disabled:opacity-60"
            >
              <BellRing className="w-3.5 h-3.5" />
              {isPushLoading ? "Enabling..." : "Enable Emergency Push Alerts"}
            </button>
            {pushMessage && (
              <p className="mt-2 text-[10px] font-medium text-red-100 bg-slate-950/90 border border-red-800 rounded-xl px-3 py-2 max-w-80">
                {pushMessage}
              </p>
            )}
          </div>
        )}

      {user &&
        ELIGIBLE_PUSH_ROLES.has(String(role || "").toLowerCase()) &&
        isPushEnabled &&
        pushMessage && (
          <div className="fixed top-40 right-6 z-[9999] animate-in fade-in slide-in-from-top-4 duration-500">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-200 bg-slate-950/90 border border-red-800 rounded-xl px-3 py-2 shadow-lg shadow-red-900/20 max-w-80">
              {pushMessage}
            </p>
          </div>
        )}

      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 w-80">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`
              p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in slide-in-from-right duration-300
              ${
                n.type === "error"
                  ? "bg-red-900 border-red-800 text-white"
                  : n.type === "success"
                    ? "bg-slate-900 border-red-800 text-white"
                    : "bg-slate-900 border-slate-800 text-white"
              }
            `}
          >
            <div
              className={`
              shrink-0 p-1.5 rounded-lg
              ${
                n.type === "error"
                  ? "bg-red-600"
                  : n.type === "success"
                    ? "bg-red-600"
                    : "bg-red-600"
              }
            `}
            >
              {n.type === "error" ? (
                <AlertTriangle className="w-4 h-4" />
              ) : n.type === "success" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-wider mb-0.5">
                {n.title}
              </p>
              <p className="text-[10px] font-medium opacity-80 leading-relaxed">
                {n.message}
              </p>
            </div>
            <button
              onClick={() =>
                setNotifications((prev) =>
                  prev.filter((item) => item.id !== n.id),
                )
              }
              className="opacity-40 hover:opacity-100 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
