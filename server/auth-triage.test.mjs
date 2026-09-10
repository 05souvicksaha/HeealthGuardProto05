import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createTestApp } from "./test-helpers.mjs";

let runtime;
let app;
before(async () => { runtime = await createTestApp(); app = runtime.app; });
after(async () => runtime.cleanup());

describe("authentication and deterministic triage", () => {
  it("sets and rotates a refresh session cookie", async () => {
    const agent = request.agent(app);
    const registered = await agent.post("/api/v1/auth/register").send({ name: "Session User", email: "session@example.test", password: "SecurePassword123" }).expect(201);
    assert.match(registered.headers["set-cookie"]?.[0] ?? "", /hg_refresh=/);
    const refreshed = await agent.post("/api/v1/auth/refresh").expect(200);
    assert.equal(refreshed.body.user.email, "session@example.test");
    assert.match(refreshed.headers["set-cookie"]?.[0] ?? "", /HttpOnly/);
  });
  it("verifies a new account with a time-limited six-digit code", async () => {
    const registered = await request(app).post("/api/v1/auth/register").send({ name: "OTP User", email: "otp@example.test", password: "SecurePassword123!" }).expect(201);
    assert.match(registered.body.verificationPreviewCode, /^\d{6}$/);
    await request(app).post("/api/v1/auth/verify-email").send({ email: "otp@example.test", code: "000000" }).expect(400);
    const verified = await request(app).post("/api/v1/auth/verify-email").send({ email: "otp@example.test", code: registered.body.verificationPreviewCode }).expect(200);
    assert.equal(verified.body.verified, true);
  });
  it("uses a generic invalid-credential error", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({ email: "missing@example.test", password: "WrongPassword123" }).expect(401);
    assert.equal(response.body.error.message, "Email or password is incorrect.");
  });
  it("detects explicit red flags before protocol matching", async () => {
    const response = await request(app).post("/api/v1/triage/assess").send({ situation: "The person is unresponsive and not breathing" }).expect(200);
    assert.equal(response.body.risk, "CRITICAL");
    assert.equal(response.body.emergencyInstructions[0], "Call 112 now.");
    assert.match(response.body.disclaimer, /not a diagnosis/i);
  });
  it("returns provider unavailable instead of fabricated AI output", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({ name: "AI User", email: "ai@example.test", password: "SecurePassword123" }).expect(201);
    await request(app).post("/api/v1/auth/verify-email").send({ email: "ai@example.test", code: register.body.verificationPreviewCode }).expect(200);
    const response = await request(app).post("/api/v1/ai/health-assistant").set("authorization", `Bearer ${register.body.accessToken}`).send({ message: "hello" }).expect(503);
    assert.equal(response.body.error.code, "PROVIDER_UNAVAILABLE");
  });
  it("blocks unverified accounts from protected health data", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({ name: "Pending User", email: "pending@example.test", password: "SecurePassword123" }).expect(201);
    const response = await request(app).get("/api/v1/patients").set("authorization", `Bearer ${register.body.accessToken}`).expect(403);
    assert.match(response.body.error.message, /verify your email/i);
  });
  it("serves imported hospitals, protocols, and flashcards from the repository", async () => {
    const healthData = await request(app).get("/api/v1/health-data").expect(200);
    assert.equal(healthData.body.hospitals.length, 108);
    assert.equal(Object.keys(healthData.body.categories).length, 20);
    assert.equal(Object.keys(healthData.body.specialtyMap).length, 20);
    assert.equal(healthData.body.protocols.length, 414);
    assert.equal(healthData.body.flashcards.length, 162);
    assert.equal(Object.keys(healthData.body.opd).length, 76);

    const privateHospitals = await request(app).get("/api/v1/hospitals?type=private&limit=100").expect(200);
    assert.equal(privateHospitals.body.total, 50);
    assert.ok(privateHospitals.body.items.every((hospital) => hospital.type === "pvt"));
  });
  it("enforces admin content CRUD and records lifecycle state", async () => {
    const registered = await request(app).post("/api/v1/auth/register").send({ name: "Content Admin", email: "content-admin@example.test", password: "SecurePassword123!" }).expect(201);
    await request(app).post("/api/v1/auth/verify-email").send({ email: "content-admin@example.test", code: registered.body.verificationPreviewCode }).expect(200);
    await runtime.repository.update("users", registered.body.user.id, { role: "ADMIN" });
    const authorization = { authorization: `Bearer ${registered.body.accessToken}` };
    const created = await request(app).post("/api/v1/admin/content/doctors").set(authorization).send({ name: "Source-backed test clinician", specialty: "Test specialty" }).expect(201);
    assert.equal(created.body.status, "ACTIVE");
    const updated = await request(app).patch(`/api/v1/admin/content/doctors/${created.body.id}`).set(authorization).send({ specialty: "Updated test specialty" }).expect(200);
    assert.equal(updated.body.specialty, "Updated test specialty");
    const verified = await request(app).post(`/api/v1/admin/content/doctors/${created.body.id}/verify`).set(authorization).send({}).expect(200);
    assert.ok(verified.body.verifiedAt);
    const deactivated = await request(app).post(`/api/v1/admin/content/doctors/${created.body.id}/deactivate`).set(authorization).send({}).expect(200);
    assert.equal(deactivated.body.status, "INACTIVE");
  });
});
