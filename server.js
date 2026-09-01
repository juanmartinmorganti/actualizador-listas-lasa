const express = require("express");
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { validarProducto } = require("./public/validation.js");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

const dataPath = path.join(__dirname, "data", "productos.json");

app.disable("x-powered-by");
app.use(express.json({ limit: "10mb" }));
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

function validarSolicitudPdf(solicitud) {
  if (!solicitud || typeof solicitud.html !== "string" || !solicitud.html.trim()) {
    return "No se recibió contenido para generar el PDF.";
  }
  if (solicitud.tipo !== "catalogo" && solicitud.tipo !== "lista") {
    return "El tipo de documento no es válido.";
  }
  return null;
}

function crearDocumentoPdf(html, tipo, origen) {
  const claseBody = tipo === "catalogo" ? "vista-catalogo" : "vista-lista";
  const contenido = tipo === "catalogo"
    ? `<div id="moduloCatalogo"><div id="catalogoContenido">${html}</div></div>`
    : `<div id="moduloResultadoFinal">${html}</div>`;

  return `<!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <base href="${origen}/">
        <link rel="stylesheet" href="style.css">
      </head>
      <body class="${claseBody}"><main>${contenido}</main></body>
    </html>`;
}

async function generarPdf(html, tipo, origen) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-crash-reporter"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(crearDocumentoPdf(html, tipo, origen), {
      waitUntil: "networkidle0",
    });
    await page.emulateMediaType("print");
    return await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
      margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
    });
  } finally {
    await browser.close();
  }
}

app.post("/api/pdf", async (req, res) => {
  const errorValidacion = validarSolicitudPdf(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  try {
    const origen = `${req.protocol}://${req.get("host")}`;
    const pdf = await generarPdf(req.body.html, req.body.tipo, origen);
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(req.body.fecha) ? req.body.fecha : "documento";
    const prefijo = req.body.tipo === "catalogo" ? "Listas-de-Precios-LASA" : "Lista-de-Precios-LASA";
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${prefijo}-${fecha}.pdf"`,
      "Content-Length": pdf.length,
    });
    res.send(Buffer.from(pdf));
  } catch (error) {
    console.error("Error al generar PDF:", error);
    res.status(500).json({ error: "No se pudo generar el PDF." });
  }
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor funcionando en http://localhost:${PORT}`);
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
