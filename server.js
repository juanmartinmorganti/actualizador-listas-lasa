const express = require("express");
const fs = require("fs");
const path = require("path");
const { LIMITES, validarSolicitudPdf, crearDocumentoPdf, generarPdf, registrarPdf } = require("./pdf");
const { validarProducto } = require("./public/validation.js");
const { createAuth } = require("./auth.js");
const { loadAuthConfig } = require("./auth-config.js");
const { leerPublicadas, escribirPublicadas, publicarCategoria, actualizarFechaPublicada } = require("./publicaciones.js");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const dataPath = path.join(process.env.LASA_DATA_DIR || path.join(__dirname, "data"), "productos.json");
const auth = createAuth(loadAuthConfig());

app.disable("x-powered-by");
// Registrar antes del parser general: PDF tiene un límite propio de 1 KB.
registrarPdf(app, { auth, dataDir: path.dirname(dataPath) });
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));
auth.register(app);

function leerProductos() {
  const data = fs.readFileSync(dataPath, "utf8");

  if (!data.trim()) {
    return [];
  }

  const productos = JSON.parse(data);
  if (!Array.isArray(productos)) {
    throw new Error("productos.json no contiene un array");
  }

  return productos;
}

function guardarProductos(productos) {
  const tempPath = `${dataPath}.${process.pid}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(productos, null, 2), "utf8");
  fs.renameSync(tempPath, dataPath);
}

function validarProductos(productos) {
  if (!Array.isArray(productos)) {
    return "El formato enviado no es válido. Se esperaba un array.";
  }

  for (const producto of productos) {
    if (
      !producto ||
      typeof producto !== "object" ||
      Array.isArray(producto) ||
      typeof producto.categoria !== "string" ||
      !producto.categoria.trim()
    ) {
      return "Cada registro debe ser un objeto con una categoría válida.";
    }
    if (producto.tipoRegistro !== "configuracion") {
      const error = validarProducto(producto);
      if (error) return `${error} (${producto.nombre || producto.categoria})`;
    }
  }

  return null;
}

app.get("/api/productos", (req, res) => {
  try {
    res.json(leerPublicadas());
  } catch (error) {
    console.error("Error al leer el catálogo publicado:", error);
    res.status(503).json({ error: "No se pudo cargar el catálogo publicado." });
  }
});

app.get("/api/borrador", auth.requireAdminRead, (req, res) => {
  try {
    res.json(leerProductos());
  } catch (error) {
    console.error("Error al leer el borrador:", error);
    res.status(500).json({ error: "No se pudo cargar el borrador." });
  }
});

app.post("/api/productos", auth.requireAdmin, (req, res) => {
  const productos = req.body;
  const errorValidacion = validarProductos(productos);

  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  try {
    guardarProductos(productos);
  } catch (error) {
    console.error("Error al guardar productos.json:", error);
    return res.status(500).json({ error: "No se pudieron guardar los productos." });
  }

  res.json({
    mensaje: "Productos guardados correctamente.",
    total: productos.length,
  });
});

function validarFechaPublicacion(categoria, fecha) {
  return typeof categoria !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha || "") ||
    !Number.isFinite(Date.parse(`${fecha}T00:00:00Z`)) ||
    new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) !== fecha;
}

app.post("/api/publicaciones", auth.requireAdmin, (req, res) => {
  const { categoria, fecha } = req.body || {};
  if (validarFechaPublicacion(categoria, fecha)) {
    return res.status(400).json({ error: "Categoría o fecha de publicación inválida." });
  }
  try {
    const borrador = leerProductos();
    if (validarProductos(borrador)) return res.status(400).json({ error: "El borrador contiene productos inválidos." });
    const publicadas = leerPublicadas();
    const nuevoCatalogo = publicarCategoria(borrador, publicadas, categoria, fecha);
    escribirPublicadas(nuevoCatalogo);
    res.json({ mensaje: "Lista publicada correctamente.", categoria, fecha });
  } catch (error) {
    if (error.message === "La categoría no tiene productos." || error.message === "La categoría no tiene configuración de publicación.") {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error al publicar lista:", error);
    res.status(500).json({ error: "No se pudo publicar la lista." });
  }
});

app.post("/api/publicaciones/fecha", auth.requireAdmin, (req, res) => {
  const { categoria, fecha } = req.body || {};
  if (validarFechaPublicacion(categoria, fecha)) {
    return res.status(400).json({ error: "Categoría o fecha de publicación inválida." });
  }
  try {
    const actualizado = actualizarFechaPublicada(leerPublicadas(), categoria, fecha);
    escribirPublicadas(actualizado);
    res.json({ mensaje: "Fecha de publicación actualizada.", categoria, fecha });
  } catch (error) {
    if (error.message === "La categoría no tiene una lista publicada.") {
      return res.status(404).json({ error: error.message });
    }
    console.error("Error al cambiar la fecha de publicación:", error);
    res.status(500).json({ error: "No se pudo actualizar la fecha publicada." });
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, process.env.LASA_HOST || "0.0.0.0", () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
    if (!auth.enabled) console.warn("Administración deshabilitada: configurar LASA_ADMIN_USER, LASA_ADMIN_PASSWORD_HASH y LASA_SESSION_SECRET.");
  });
}

module.exports = {
  app,
  crearDocumentoPdf,
  generarPdf,
  leerProductos,
  guardarProductos,
  validarProductos,
  validarSolicitudPdf,
};
