const { Server } = require("socket.io");
const { verifyUserFromToken } = require("../lib/auth");
const { normalizeIncidentMessageRole } = require("../utils/normalize");
const { maskPhone } = require("../utils/mask");
const { Incident } = require("../models");

let io = null;

const TEAM_PRIVILEGED_ROOM = "team:privileged"; // dispatcher, admin — full data
const TEAM_VOLUNTEER_ROOM = "team:volunteer"; // volunteer — masked data
const incidentRoom = (incidentId) => `incident:${incidentId}`;

const init = (server, allowedOrigins) => {
  io = new Server(server, {
    cors: { origin: allowedOrigins },
  });

  io.on("connection", async (socket) => {
    // Authenticate the socket using the same JWT the REST API trusts.
    // Anonymous connections are still allowed (citizens using the panic
    // button aren't logged in) — they just don't get auto-joined to any
    // team room, and can only join a specific incident's room by proving
    // they hold that incident's access token (see join-incident below).
    const token = socket.handshake.auth?.token;
    const user = token ? await verifyUserFromToken(token) : null;

    if (user) {
      socket.user = { id: String(user._id), role: user.role };
      const teamRole = normalizeIncidentMessageRole(user.role);
      if (teamRole === "dispatcher") {
        socket.join(TEAM_PRIVILEGED_ROOM);
      } else if (teamRole === "volunteer") {
        socket.join(TEAM_VOLUNTEER_ROOM);
      }
      console.log(`Client connected: ${socket.id} (${user.role})`);
    } else {
      socket.user = null;
      console.log(`Client connected: ${socket.id} (anonymous)`);
    }

    socket.on(
      "join-incident",
      async ({ incidentId, token: incidentToken } = {}, callback) => {
        const ack = typeof callback === "function" ? callback : () => {};

        if (!incidentId) {
          return ack({ ok: false, error: "incidentId is required" });
        }

        if (socket.user) {
          socket.join(incidentRoom(incidentId));
          return ack({ ok: true });
        }

        if (!incidentToken || String(incidentToken) !== String(incidentId)) {
          return ack({ ok: false, error: "Invalid incident token" });
        }

        try {
          const exists = await Incident.exists({ _id: incidentId });
          if (!exists) {
            return ack({ ok: false, error: "Incident not found" });
          }
        } catch (err) {
          return ack({ ok: false, error: "Invalid incident id" });
        }

        socket.join(incidentRoom(incidentId));
        return ack({ ok: true });
      },
    );

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.io has not been initialized. Call init(server) first.",
    );
  }
  return io;
};
// Emit an event to the team, with different payloads for privileged
// (dispatcher/admin, full data) vs volunteer (masked) rooms, and optionally
// also to the specific incident's room (so the citizen who owns it gets the
// update too — same access-token trust model as the REST endpoints).
const emitIncidentEvent = (eventName, incident, { incidentId } = {}) => {
  const ioInstance = getIO();
  const maskedIncident = incident
    ? { ...incident, reporter_phone: maskPhone(incident.reporter_phone) }
    : incident;

  ioInstance.to(TEAM_PRIVILEGED_ROOM).emit(eventName, incident);
  ioInstance.to(TEAM_VOLUNTEER_ROOM).emit(eventName, maskedIncident);

  if (incidentId) {
    ioInstance.to(incidentRoom(incidentId)).emit(eventName, incident);
  }
};

const emitToTeam = (eventName, payload) => {
  const ioInstance = getIO();
  ioInstance
    .to([TEAM_PRIVILEGED_ROOM, TEAM_VOLUNTEER_ROOM])
    .emit(eventName, payload);
};

const emitToIncident = (incidentId, eventName, payload) => {
  const ioInstance = getIO();
  ioInstance.to(incidentRoom(incidentId)).emit(eventName, payload);
};

const emitToTeamAndIncident = (incidentId, eventName, payload) => {
  const ioInstance = getIO();
  ioInstance
    .to([TEAM_PRIVILEGED_ROOM, TEAM_VOLUNTEER_ROOM, incidentRoom(incidentId)])
    .emit(eventName, payload);
};
module.exports = {
  init,
  getIO,
  emitIncidentEvent,
  emitToTeam,
  emitToIncident,
  emitToTeamAndIncident,
  TEAM_PRIVILEGED_ROOM,
  TEAM_VOLUNTEER_ROOM,
  incidentRoom,
};
