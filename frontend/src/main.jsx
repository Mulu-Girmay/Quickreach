import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

const SW_CLEANUP_KEY = "quickreach_sw_cleanup_done";

const clearLegacyServiceWorkers = async () => {
  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    }

    if ("caches" in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName)),
      );
    }
  } catch (error) {
    console.warn("Failed to clear legacy service worker caches:", error);
  }
};

if (!localStorage.getItem(SW_CLEANUP_KEY)) {
  clearLegacyServiceWorkers().finally(() => {
    localStorage.setItem(SW_CLEANUP_KEY, "true");
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
