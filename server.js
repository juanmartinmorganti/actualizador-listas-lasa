const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const dataPath = path.join(__dirname, "data", "productos.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function leerProductos() {
  try {
    const data = fs.readFileSync(dataPath, "utf8");

    if (!data.trim()) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error("Error al leer productos.json:", error);
    return [];
  }
}

function guardarProductos(productos) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(productos, null, 2), "utf8");
  } catch (error) {
    console.error("Error al guardar productos.json:", error);
  }
}

app.get("/api/productos", (req, res) => {
  const productos = leerProductos();
  res.json(productos);
});

app.post("/api/productos", (req, res) => {
  const productos = req.body;

  if (!Array.isArray(productos)) {
    return res.status(400).json({
      error: "El formato enviado no es válido. Se esperaba un array.",
    });
  }

  guardarProductos(productos);

  res.json({
    mensaje: "Productos guardados correctamente.",
    total: productos.length,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor funcionando en http://localhost:${PORT}`);
});
