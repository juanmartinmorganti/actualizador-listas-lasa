const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { once } = require("node:events");
const { createAuth, hashPassword, verifyPassword } = require("../auth");

test("la contraseña se verifica contra un hash con sal individual", () => {
  const stored = hashPassword("contraseña-de-prueba-segura");
  assert.equal(verifyPassword("contraseña-de-prueba-segura", stored), true);
  assert.equal(verifyPassword("incorrecta", stored), false);
  assert.equal(verifyPassword("contraseña", "texto-plano"), false);
});

test("sin configuración no se habilitan las escrituras", async (t) => {
  const app = express();
  app.use(express.json());
  const auth = createAuth();
  auth.register(app);
  app.post("/api/productos", auth.requireAdmin, (req, res) => res.sendStatus(200));
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/productos`, { method: "POST", headers: { Origin: base } });
  assert.equal(response.status, 401);
});

test("solo sesión válida y solicitud del mismo origen permiten editar", async (t) => {
  const app = express();
  app.use(express.json());
  const auth = createAuth({ username: "operador", passwordHash: hashPassword("una-clave-larga-segura"), secret: "a".repeat(64) });
  auth.register(app);
  app.post("/api/productos", auth.requireAdmin, (req, res) => res.sendStatus(200));
  const server = app.listen(0, "127.0.0.1");
  t.after(() => server.close());
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = (usuario, contrasena) => fetch(`${base}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({ usuario, contrasena }),
  });
  assert.equal((await login("operador", "incorrecta")).status, 401);
  const response = await login("operador", "una-clave-larga-segura");
  assert.equal(response.status, 200);
  const cookie = response.headers.get("set-cookie").split(";")[0];
  assert.match(response.headers.get("set-cookie"), /HttpOnly; SameSite=Strict/);
  assert.equal((await fetch(`${base}/api/productos`, { method: "POST", headers: { Cookie: cookie, Origin: base } })).status, 200);
  assert.equal((await fetch(`${base}/api/productos`, { method: "POST", headers: { Cookie: cookie, Origin: "http://ejemplo.local" } })).status, 403);
  assert.equal((await fetch(`${base}/api/productos`, { method: "POST", headers: { Cookie: `${cookie}alterado`, Origin: base } })).status, 401);
  assert.equal((await fetch(`${base}/api/productos`, { method: "POST", headers: { Origin: base } })).status, 401);
});
