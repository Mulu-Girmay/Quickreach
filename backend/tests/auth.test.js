const request = require("supertest");
const { connect, clearDatabase, closeDatabase } = require("./helpers/db");
const { buildApp, createUser } = require("./helpers/testApp");

let app;

beforeAll(async () => {
  await connect();
  const built = buildApp();
  app = built.app;
});

afterEach(async () => {
  await clearDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

describe("Authentication & Dispatcher Management Integration Tests", () => {
  test("Public volunteer registration assigns role: 'volunteer'", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test Volunteer",
        email: "volunteer@example.com",
        password: "password123",
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe("volunteer");
    expect(res.body.user.password).toBeUndefined();
  });

  test("GET /api/auth/me returns authenticated user profile", async () => {
    const { token, user } = await createUser({
      name: "Dispatcher Jane",
      email: "jane@quickreach.com",
      role: "dispatcher",
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(user.email);
    expect(res.body.user.role).toBe("dispatcher");
    expect(res.body.user.password).toBeUndefined();
  });

  test("Authenticated dispatcher can create another dispatcher account", async () => {
    const { token: dispatcherToken } = await createUser({
      name: "Lead Dispatcher",
      email: "lead@quickreach.com",
      role: "dispatcher",
    });

    const res = await request(app)
      .post("/api/auth/dispatchers")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        name: "New Dispatcher",
        email: "new.dispatcher@quickreach.com",
        password: "securepassword123",
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("new.dispatcher@quickreach.com");
    expect(res.body.user.role).toBe("dispatcher");
    expect(res.body.user.password).toBeUndefined();
  });

  test("Non-dispatchers (volunteers) cannot create dispatchers (403)", async () => {
    const { token: volunteerToken } = await createUser({
      name: "Regular Volunteer",
      email: "volunteer@quickreach.com",
      role: "volunteer",
    });

    const res = await request(app)
      .post("/api/auth/dispatchers")
      .set("Authorization", `Bearer ${volunteerToken}`)
      .send({
        name: "Hacked Dispatcher",
        email: "hacked@quickreach.com",
        password: "securepassword123",
      });

    expect(res.status).toBe(403);
  });

  test("Unauthenticated requests cannot create dispatchers (401)", async () => {
    const res = await request(app)
      .post("/api/auth/dispatchers")
      .send({
        name: "Anon Dispatcher",
        email: "anon@quickreach.com",
        password: "securepassword123",
      });

    expect(res.status).toBe(401);
  });

  test("Duplicate dispatcher email returns 409 conflict", async () => {
    const { token: dispatcherToken } = await createUser({
      name: "Lead Dispatcher",
      email: "lead@quickreach.com",
      role: "dispatcher",
    });

    // Create first dispatcher
    await request(app)
      .post("/api/auth/dispatchers")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        name: "Dispatcher One",
        email: "same.email@quickreach.com",
        password: "securepassword123",
      });

    // Attempt to create with duplicate email
    const res = await request(app)
      .post("/api/auth/dispatchers")
      .set("Authorization", `Bearer ${dispatcherToken}`)
      .send({
        name: "Dispatcher Duplicate",
        email: "same.email@quickreach.com",
        password: "securepassword123",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  test("GET /api/auth/dispatchers returns list of dispatchers for authorized users", async () => {
    const { token: dispatcherToken } = await createUser({
      name: "Lead Dispatcher",
      email: "lead@quickreach.com",
      role: "dispatcher",
    });

    const res = await request(app)
      .get("/api/auth/dispatchers")
      .set("Authorization", `Bearer ${dispatcherToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.dispatchers)).toBe(true);
    expect(res.body.dispatchers.length).toBeGreaterThanOrEqual(1);
  });
});
