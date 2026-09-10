import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import request from "supertest";
import { createTestApp } from "./test-helpers.mjs";

let runtime;
let app;
let tokenA;
let tokenB;
let patientA;
let patientB;

async function register(email, name) {
  const response = await request(app).post("/api/v1/auth/register").send({ name, email, password: "SecurePassword123" }).expect(201);
  await request(app).post("/api/v1/auth/verify-email").send({ email, code: response.body.verificationPreviewCode }).expect(200);
  return response.body.accessToken;
}

const auth = (token) => ({ authorization: `Bearer ${token}` });

before(async () => {
  runtime = await createTestApp();
  app = runtime.app;
  tokenA = await register("owner-a@example.test", "Owner A");
  tokenB = await register("owner-b@example.test", "Owner B");
  patientA = (await request(app).post("/api/v1/patients").set(auth(tokenA)).send({ name: "Patient A", relationship: "self" }).expect(201)).body;
  patientB = (await request(app).post("/api/v1/patients").set(auth(tokenB)).send({ name: "Patient B", relationship: "self" }).expect(201)).body;
});
after(async () => runtime.cleanup());

describe("patient-owned resource isolation", () => {
  it("prevents another user from GET, UPDATE, and DELETE on a patient", async () => {
    await request(app).get(`/api/v1/patients/${patientA.id}`).set(auth(tokenB)).expect(404);
    await request(app).patch(`/api/v1/patients/${patientA.id}`).set(auth(tokenB)).send({ name: "Stolen" }).expect(404);
    await request(app).delete(`/api/v1/patients/${patientA.id}`).set(auth(tokenB)).expect(404);
    const ownerView = await request(app).get(`/api/v1/patients/${patientA.id}`).set(auth(tokenA)).expect(200);
    assert.equal(ownerView.body.name, "Patient A");
  });

  it("isolates family records and list results", async () => {
    const family = (await request(app).post("/api/v1/families").set(auth(tokenA)).send({ name: "A Family" }).expect(201)).body;
    await request(app).get(`/api/v1/families/${family.id}`).set(auth(tokenB)).expect(404);
    await request(app).patch(`/api/v1/families/${family.id}`).set(auth(tokenB)).send({ name: "Changed" }).expect(404);
    await request(app).delete(`/api/v1/families/${family.id}`).set(auth(tokenB)).expect(404);
    const listB = await request(app).get("/api/v1/families").set(auth(tokenB)).expect(200);
    assert.equal(listB.body.total, 0);
  });

  for (const [pathName, payload] of [
    ["medications", { name: "Test medicine", dose: "1 tablet" }],
    ["prescriptions", { clinicianName: "As written on source", notes: "Test" }]
  ]) {
    it(`isolates ${pathName} for read, update, and delete`, async () => {
      const item = (await request(app).post(`/api/v1/${pathName}`).set(auth(tokenA)).send({ patientId: patientA.id, ...payload }).expect(201)).body;
      await request(app).get(`/api/v1/${pathName}/${item.id}`).set(auth(tokenB)).expect(404);
      await request(app).patch(`/api/v1/${pathName}/${item.id}`).set(auth(tokenB)).send({ notes: "Unauthorized" }).expect(404);
      await request(app).delete(`/api/v1/${pathName}/${item.id}`).set(auth(tokenB)).expect(404);
      await request(app).get(`/api/v1/${pathName}/${item.id}`).set(auth(tokenA)).expect(200);
    });
  }

  it("prevents cross-user report metadata, download, analysis, and deletion", async () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
    const report = (await request(app).post("/api/v1/reports").set(auth(tokenA)).field("patientId", patientA.id).attach("file", pdf, { filename: "report.pdf", contentType: "application/pdf" }).expect(201)).body;
    await request(app).get(`/api/v1/reports/${report.id}`).set(auth(tokenB)).expect(404);
    await request(app).get(`/api/v1/reports/${report.id}/download`).set(auth(tokenB)).expect(404);
    await request(app).post(`/api/v1/reports/${report.id}/analyze`).set(auth(tokenB)).send({}).expect(404);
    await request(app).delete(`/api/v1/reports/${report.id}`).set(auth(tokenB)).expect(404);
    const download = await request(app).get(`/api/v1/reports/${report.id}/download`).set(auth(tokenA)).expect(200);
    assert.match(download.headers["content-type"], /application\/pdf/);
  });

  it("keeps patient profile photos private and owner-scoped", async () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const upload = await request(app)
      .post(`/api/v1/patients/${patientA.id}/photo`)
      .set(auth(tokenA))
      .attach("file", png, { filename: "profile.png", contentType: "image/png" })
      .expect(201);
    assert.equal(upload.body.patientId, patientA.id);
    assert.equal(upload.body.mimeType, "image/png");

    await request(app).get(`/api/v1/patients/${patientA.id}/photo`).set(auth(tokenB)).expect(404);
    await request(app)
      .post(`/api/v1/patients/${patientA.id}/photo`)
      .set(auth(tokenB))
      .attach("file", png, { filename: "stolen.png", contentType: "image/png" })
      .expect(404);

    const ownerView = await request(app).get(`/api/v1/patients/${patientA.id}/photo`).set(auth(tokenA)).expect(200);
    assert.match(ownerView.headers["content-type"], /image\/png/);
    assert.equal(ownerView.headers["cache-control"], "private, no-store");
  });

  it("rejects attaching a record to another user's patient id", async () => {
    await request(app).post("/api/v1/medications").set(auth(tokenA)).send({ patientId: patientB.id, name: "Unauthorized medicine" }).expect(404);
  });
});
