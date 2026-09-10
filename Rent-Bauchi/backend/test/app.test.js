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

const { createApp, prepareDemoAccounts } = require("../src/server");

let server;
let base;
let demo;

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
  await prepareDemoAccounts();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = "http://127.0.0.1:" + server.address().port;
  demo = {
    renter: await req("POST", "/api/auth/login", {
      body: { identifier: "renter@rentbauchi.test", password: "123456" },
    }),
    agent: await req("POST", "/api/auth/login", {
      body: { identifier: "agent@rentbauchi.test", password: "123456" },
    }),
    admin: await req("POST", "/api/auth/login", {
      body: { identifier: "admin@rentbauchi.test", password: "Admin123" },
    }),
  };
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

test("demo accounts can log in", () => {
  for (const acc of [demo.renter, demo.agent, demo.admin]) {
    assert.strictEqual(acc.status, 200);
    assert.ok(acc.json.token);
    assert.ok(acc.json.user.id);
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
    token: demo.renter.json.token,
  });
  assert.strictEqual(r.status, 403);
});

test("property approval workflow", async () => {
  const created = await req("POST", "/api/agent/properties", {
    token: demo.agent.json.token,
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
    token: demo.admin.json.token,
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
  const saved = await req("POST", "/api/renter/saved/p-1", {
    token: demo.renter.json.token,
  });
  assert.strictEqual(saved.status, 200);

  const list = await req("GET", "/api/renter/saved", {
    token: demo.renter.json.token,
  });
  assert.ok(list.json.properties.some((p) => p.id === "p-1"));

  const unsaved = await req("DELETE", "/api/renter/saved/p-1", {
    token: demo.renter.json.token,
  });
  assert.strictEqual(unsaved.status, 200);

  const afterList = await req("GET", "/api/renter/saved", {
    token: demo.renter.json.token,
  });
  assert.ok(!afterList.json.properties.some((p) => p.id === "p-1"));
});

test("renter request shows up for admin", async () => {
  const created = await req("POST", "/api/renter/requests", {
    token: demo.renter.json.token,
    body: {
      propertyId: "p-1",
      type: "inspection",
      message: "Automated test request",
    },
  });
  assert.strictEqual(created.status, 201);

  const adminView = await req("GET", "/api/admin/requests", {
    token: demo.admin.json.token,
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
    token: demo.renter.json.token,
    body: { title: "nope" },
  });
  assert.strictEqual(r.status, 403);
});