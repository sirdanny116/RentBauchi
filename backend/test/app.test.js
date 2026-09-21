const { test, before, after } = require("node:test");
const assert = require("node:assert");
const os = require("os");
const path = require("path");
const fs = require("fs");

const DB_FILE = path.join(
  os.tmpdir(),
  "rentbauchi-test-" + process.pid + "-" + Date.now() + ".db",
);
process.env.DB_FILE = DB_FILE;
// Force the mailer into demo mode so tests never hit a real SMTP server and
// the reset code is returned in the response. dotenv does not override vars
// that already exist, so clearing them here wins over backend/.env.
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";

const { createApp } = require("../src/server");

let server;
let base;
let renter;
let agent;
let admin;
let seededPropertyId;

async function req(method, url, { token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = "http://127.0.0.1:" + server.address().port;

  const renterReg = await req("POST", "/api/auth/register", {
    body: {
      fullName: "Suite Renter",
      role: "renter",
      username: "suite_renter",
      phone: "08000000001",
      email: "suite_renter@example.com",
      password: "123456",
      confirmPassword: "123456",
    },
  });
  const agentReg = await req("POST", "/api/auth/register", {
    body: {
      fullName: "Suite Owner",
      role: "agent",
      username: "suite_agent",
      phone: "08000000002",
      email: "suite_agent@example.com",
      password: "123456",
      confirmPassword: "123456",
    },
  });
  const adminReg = await req("POST", "/api/auth/setup-admin", {
    body: {
      fullName: "Suite Admin",
      email: "suite_admin@example.com",
      password: "Admin123",
      confirmPassword: "Admin123",
      setupKey: process.env.SETUP_KEY,
    },
  });

  renter = { token: renterReg.json.token, identifier: "suite_renter@example.com", password: "123456" };
  agent = { token: agentReg.json.token, identifier: "suite_agent@example.com", password: "123456" };
  admin = { token: adminReg.json.token, identifier: "suite_admin@example.com", password: "Admin123" };

  // Seed one approved property so the saved/request tests have a real target.
  const seeded = await req("POST", "/api/agent/properties", {
    token: agent.token,
    body: {
      title: "Seeded Suite Property",
      location: "Yelwa",
      type: "Residential",
      subtype: "Flat",
      annualRent: 300000,
      description: "Seeded by the automated test suite.",
    },
  });
  seededPropertyId = seeded.json.property.id;
  await req("PUT", "/api/admin/properties/" + seededPropertyId, {
    token: admin.token,
    body: { action: "APPROVED", inspectionFee: 5000 },
  });
});

after(() => {
  server.close();
  try {
    fs.unlinkSync(DB_FILE);
  } catch {}
});

test("health endpoint", async () => {
  const { status, json } = await req("GET", "/api/health");
  assert.strictEqual(status, 200);
  assert.strictEqual(json.ok, true);
});

test("accounts can log in", async () => {
  for (const acc of [renter, agent, admin]) {
    const res = await req("POST", "/api/auth/login", {
      body: { identifier: acc.identifier, password: acc.password },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.json.token);
    assert.ok(res.json.user.id);
  }
});

test("register rejects bad input and duplicate email", async () => {
  const bad = await req("POST", "/api/auth/register", {
    body: { fullName: "X", role: "hacker", password: "123456" },
  });
  assert.strictEqual(bad.status, 400);

  const good = await req("POST", "/api/auth/register", {
    body: {
      fullName: "Test Renter",
      role: "renter",
      username: "testrenter1",
      phone: "08000000000",
      email: "testrenter1@example.com",
      password: "123456",
      confirmPassword: "123456",
    },
  });
  assert.strictEqual(good.status, 201);
  assert.ok(good.json.token);

  const dup = await req("POST", "/api/auth/register", {
    body: {
      fullName: "Test Renter",
      role: "renter",
      username: "testrenter1",
      phone: "08000000000",
      email: "testrenter1@example.com",
      password: "123456",
      confirmPassword: "123456",
    },
  });
  assert.strictEqual(dup.status, 409);
});

test("role guard blocks non-admin from admin routes", async () => {
  const r = await req("GET", "/api/admin/users", {
    token: renter.token,
  });
  assert.strictEqual(r.status, 403);
});

test("property approval workflow", async () => {
  const created = await req("POST", "/api/agent/properties", {
    token: agent.token,
    body: {
      title: "Test Suite Flat",
      location: "Yelwa",
      type: "Residential",
      subtype: "Flat",
      annualRent: 400000,
      description: "Created by automated test.",
    },
  });
  assert.strictEqual(created.status, 201);
  const pid = created.json.property.id;
  assert.strictEqual(created.json.property.status, "PENDING");

  assert.strictEqual(
    (await req("GET", "/api/properties/" + pid)).status,
    404,
    "pending property must not be publicly visible",
  );

  const approved = await req("PUT", "/api/admin/properties/" + pid, {
    token: admin.token,
    body: { action: "APPROVED", inspectionFee: 20000 },
  });
  assert.strictEqual(approved.status, 200);
  assert.strictEqual(approved.json.property.inspectionFee, 20000);

  const pub = await req("GET", "/api/properties/" + pid);
  assert.strictEqual(pub.status, 200);
  assert.strictEqual(pub.json.property.status, "APPROVED");

  const list = await req(
    "GET",
    "/api/properties?q=" + encodeURIComponent("Test Suite Flat"),
  );
  assert.ok(list.json.properties.some((p) => p.id === pid));
});

test("renter save and unsave a property", async () => {
  const saved = await req("POST", "/api/renter/saved/" + seededPropertyId, {
    token: renter.token,
  });
  assert.strictEqual(saved.status, 200);

  const list = await req("GET", "/api/renter/saved", {
    token: renter.token,
  });
  assert.ok(list.json.properties.some((p) => p.id === seededPropertyId));

  const unsaved = await req("DELETE", "/api/renter/saved/" + seededPropertyId, {
    token: renter.token,
  });
  assert.strictEqual(unsaved.status, 200);

  const afterList = await req("GET", "/api/renter/saved", {
    token: renter.token,
  });
  assert.ok(!afterList.json.properties.some((p) => p.id === seededPropertyId));
});

test("renter request shows up for admin", async () => {
  const created = await req("POST", "/api/renter/requests", {
    token: renter.token,
    body: {
      propertyId: seededPropertyId,
      type: "inspection",
      message: "Automated test request",
    },
  });
  assert.strictEqual(created.status, 201);

  const adminView = await req("GET", "/api/admin/requests", {
    token: admin.token,
  });
  assert.ok(adminView.json.requests.some((r) => r.message === "Automated test request"));
});

test("password reset flow", async () => {
  const unknown = await req("POST", "/api/auth/forgot", {
    body: { email: "nobody@example.com" },
  });
  assert.strictEqual(unknown.status, 404);

  const forgot = await req("POST", "/api/auth/forgot", {
    body: { email: "testrenter1@example.com" },
  });
  assert.strictEqual(forgot.status, 200);
  assert.ok(forgot.json.resetToken);
  assert.match(forgot.json.resetToken, /^\d{6}$/);

  const badToken = await req("POST", "/api/auth/reset", {
    body: {
      email: "testrenter1@example.com",
      token: "wrong-token",
      newPassword: "abcdef",
    },
  });
  assert.strictEqual(badToken.status, 400);

  const reset = await req("POST", "/api/auth/reset", {
    body: {
      email: "testrenter1@example.com",
      token: forgot.json.resetToken,
      newPassword: "newpass123",
    },
  });
  assert.strictEqual(reset.status, 200);

  const login = await req("POST", "/api/auth/login", {
    body: {
      identifier: "testrenter1@example.com",
      password: "newpass123",
    },
  });
  assert.strictEqual(login.status, 200);
  assert.ok(login.json.token);
});

test("registered renter cannot access agent routes", async () => {
  const r = await req("POST", "/api/agent/properties", {
    token: renter.token,
    body: { title: "nope" },
  });
  assert.strictEqual(r.status, 403);
});