const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const defaultConfigPath = path.join(os.homedir(), ".config", "lasa", "actualizador-listas.json");

function loadAuthConfig(configPath = process.env.LASA_AUTH_CONFIG || defaultConfigPath) {
  if (process.env.LASA_ADMIN_USER || process.env.LASA_ADMIN_PASSWORD_HASH || process.env.LASA_SESSION_SECRET) {
    return {
      username: process.env.LASA_ADMIN_USER,
      passwordHash: process.env.LASA_ADMIN_PASSWORD_HASH,
      secret: process.env.LASA_SESSION_SECRET,
    };
  }

  try {
    const stat = fs.statSync(configPath);
    if (!stat.isFile()) throw new Error("La configuración no es un archivo.");
    if (process.platform !== "win32" && (stat.mode & 0o077)) {
      throw new Error("La configuración debe tener permisos 600.");
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    return {
      username: config.username,
      passwordHash: config.passwordHash,
      secret: config.secret,
    };
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`No se pudo cargar la configuración administrativa: ${error.message}`);
  }
}

module.exports = { loadAuthConfig, defaultConfigPath };
