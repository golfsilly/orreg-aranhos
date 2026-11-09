import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// Opt in only against an isolated test server with an empty/test-only database.
const base = process.env.OR_REG_TEST_URL;
const email = process.env.OR_REG_TEST_ADMIN_EMAIL;
const password = process.env.OR_REG_TEST_ADMIN_PASSWORD;
const enabled = base === "http://localhost:3105" && Boolean(email && password);

test("isolated server: user and profile lifecycle", { skip: !enabled }, async () => {
  async function request(path, { cookie, method = "GET", body } = {}) {
    return fetch(`${base}${path}`, { method, headers: { origin: base, ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  const login = await request("/api/auth/sign-in/email", { method: "POST", body: { email, password } });
  assert.equal(login.status, 200);
  const adminCookie = login.headers.get("set-cookie")?.split(";")[0];
  assert.ok(adminCookie);
  const suffix = randomUUID();
  const userEmail = `fixture-${suffix}@example.test`;
  const create = await request("/api/users", { method: "POST", cookie: adminCookie, body: { name: "Fixture Nurse", email: userEmail, password: "123456", role: "NURSE", organization: "Test Hospital", workGroup: "OR" } });
  assert.equal(create.status, 201);
  const user = (await create.json()).user;
  assert.equal(user.workGroup, "OR");
  const userLogin = await request("/api/auth/sign-in/email", { method: "POST", body: { email: userEmail, password: "123456" } });
  assert.equal(userLogin.status, 200);
  const userCookie = userLogin.headers.get("set-cookie")?.split(";")[0];
  assert.ok(userCookie);
  assert.equal((await request("/api/profile/details", { method: "PATCH", cookie: userCookie, body: { name: "Fixture Updated", organization: "", jobTitle: "Nurse" } })).status, 200);
  assert.equal((await request("/api/profile/details", { method: "PATCH", cookie: userCookie, body: { name: "Fixture", role: "SUPERADMIN" } })).status, 400);
  assert.equal((await request("/api/profile/password", { method: "POST", cookie: userCookie, body: { currentPassword: "wrong", newPassword: "abcdef" } })).status, 400);
  assert.equal((await request("/api/profile/password", { method: "POST", cookie: userCookie, body: { currentPassword: "123456", newPassword: "abcdef" } })).status, 200);
  assert.notEqual((await request("/api/auth/change-password", { method: "POST", cookie: userCookie, body: { currentPassword: "abcdef", newPassword: "qwerty" } })).status, 200);
  assert.equal((await request(`/api/users/${user.id}`, { method: "DELETE", cookie: adminCookie })).status, 200);
  assert.equal((await request("/api/profile/details", { method: "PATCH", cookie: userCookie, body: { name: "Fixture" } })).status, 403);
  const deleted = await (await request(`/api/users?status=deleted&search=${encodeURIComponent(userEmail)}`, { cookie: adminCookie })).json();
  assert.equal(deleted.total, 1);
  assert.equal((await request(`/api/users/${user.id}`, { method: "POST", cookie: adminCookie })).status, 200);
  const restored = await (await request(`/api/users?status=inactive&search=${encodeURIComponent(userEmail)}`, { cookie: adminCookie })).json();
  assert.equal(restored.users[0].isActive, false);
  assert.equal(restored.users[0].name, "Fixture Updated");
});
