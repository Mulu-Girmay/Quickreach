import { io } from "socket.io-client";

const SOCKET_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/$/, "");

let socketInstance = null;

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_BASE || window.location.origin, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: (cb) => {
        const token = localStorage.getItem("quickreach_auth_token");
        cb({ token: token || null });
      },
    });
  }

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};
