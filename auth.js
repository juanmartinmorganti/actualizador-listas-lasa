const crypto = require("node:crypto");

const COOKIE = "lasa_admin";
const SESSION_MS = 8 * 60 * 60 * 1000;

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (typeof stored !== "string" || !/^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(stored)) return false;
  const [salt, expected] = stored.split(":");
  const actual = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

function createAuth({ username, passwordHash, secret } = {}) {
  const enabled = Boolean(username && passwordHash && secret && secret.length >= 32);
  const attempts = new Map();

  function sign(payload) {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  function isAuthenticated(req) {
    if (!enabled) return false;
    const value = (req.headers.cookie || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
    if (!value) return false;
    const [expires, nonce, signature, extra] = value.split(".");
    if (extra || !/^\d+$/.test(expires || "") || !/^[a-f0-9]{32}$/.test(nonce || "") || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
    const valid = sign(`${expires}.${nonce}`);
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(valid, "hex")) && Number(expires) > Date.now();
  }

  function cookie(req, value, maxAge) {
    return `${COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${req.secure ? "; Secure" : ""}`;
  }

  function sameOrigin(req) {
    const origin = req.get("origin");
    return origin === `${req.protocol}://${req.get("host")}`;
  }

  function requireAdmin(req, res, next) {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Iniciá sesión para administrar las listas." });
    if (!sameOrigin(req)) return res.status(403).json({ error: "Origen de solicitud no permitido." });
    next();
  }

  function requireAdminRead(req, res, next) {
    if (!isAuthenticated(req)) return res.status(401).json({ error: "Iniciá sesión para administrar las listas." });
    next();
  }

  function register(app) {
    app.get("/api/auth/me", (req, res) => res.json({ authenticated: isAuthenticated(req), enabled }));

    app.post("/api/auth/login", (req, res) => {
      if (!enabled) return res.status(503).json({ error: "Acceso administrativo sin configurar." });
      if (!sameOrigin(req)) return res.status(403).json({ error: "Origen de solicitud no permitido." });

      const ip = req.ip;
      const now = Date.now();
      const previous = attempts.get(ip);
      const current = previous && previous.until > now ? previous : { count: 0, until: now + 15 * 60 * 1000 };
      if (current.count >= 5) return res.status(429).json({ error: "Demasiados intentos. Volvé a probar en unos minutos." });

      const { usuario, contrasena } = req.body || {};
      const validUser = typeof usuario === "string" && usuario === username;
      const validPassword = typeof contrasena === "string" && contrasena.length <= 1024 && verifyPassword(contrasena, passwordHash);
      if (!validUser || !validPassword) {
        current.count++;
        attempts.set(ip, current);
        return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
      }
      attempts.delete(ip);
      const expires = Date.now() + SESSION_MS;
      const payload = `${expires}.${crypto.randomBytes(16).toString("hex")}`;
      res.set("Set-Cookie", cookie(req, `${payload}.${sign(payload)}`, SESSION_MS / 1000));
      res.json({ authenticated: true });
    });

    app.post("/api/auth/logout", requireAdmin, (req, res) => {
      res.set("Set-Cookie", cookie(req, "", 0));
      res.json({ authenticated: false });
    });
  }

  return { enabled, isAuthenticated, requireAdmin, requireAdminRead, register };
}

module.exports = { createAuth, hashPassword, verifyPassword };
