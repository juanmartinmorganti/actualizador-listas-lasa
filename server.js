const express = require("express");
const fs = require("fs");
const path = require("path");
const { validarProducto } = require("./public/validation.js");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const dataPath = path.join(__dirname, "data", "productos.json");

app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));

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
    res.json(leerProductos());
  } catch (error) {
    console.error("Error al leer productos.json:", error);
    res.status(500).json({ error: "No se pudieron cargar los productos." });
  }
});

app.post("/api/productos", (req, res) => {
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

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
  });
}

module.exports = { app, leerProductos, guardarProductos, validarProductos };
