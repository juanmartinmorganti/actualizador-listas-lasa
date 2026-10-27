const fs = require("node:fs");
const path = require("node:path");

const RUTA_PUBLICADAS = path.join(process.env.LASA_DATA_DIR || path.join(__dirname, "data"), "publicadas.json");

function leerPublicadas(ruta = RUTA_PUBLICADAS) {
  const datos = JSON.parse(fs.readFileSync(ruta, "utf8"));
  if (!Array.isArray(datos)) throw new Error("El catálogo publicado no contiene una lista.");
  return datos;
}

function escribirPublicadas(datos, ruta = RUTA_PUBLICADAS) {
  const temporal = `${ruta}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporal, JSON.stringify(datos, null, 2), { flag: "wx", mode: 0o600 });
    fs.renameSync(temporal, ruta);
  } catch (error) {
    try { fs.unlinkSync(temporal); } catch { /* No existe temporal para limpiar. */ }
    throw error;
  }
}

function copiarCategoria(borrador, categoria, fecha) {
  const registros = borrador
    .filter((registro) => registro.categoria === categoria)
    .map((registro) => structuredClone(registro));
  const productos = registros.filter((registro) => registro.tipoRegistro !== "configuracion");
  if (!productos.length) throw new Error("La categoría no tiene productos.");
  const configuracion = registros.find((registro) => registro.tipoRegistro === "configuracion");
  if (!configuracion) throw new Error("La categoría no tiene configuración de publicación.");
  configuracion.fechaPublicacion = fecha;
  configuracion.publishedAt = new Date().toISOString();
  if (categoria === "Bolsas Fast Food") configuracion.productosPublicados = structuredClone(productos);
  return registros;
}

function publicarCategoria(borrador, publicadas, categoria, fecha) {
  return [
    ...publicadas.filter((registro) => registro.categoria !== categoria),
    ...copiarCategoria(borrador, categoria, fecha),
  ];
}

function actualizarFechaPublicada(publicadas, categoria, fecha) {
  const configuracion = publicadas.find((registro) =>
    registro.categoria === categoria && registro.tipoRegistro === "configuracion"
  );
  if (!configuracion || !publicadas.some((registro) =>
    registro.categoria === categoria && registro.tipoRegistro !== "configuracion"
  )) throw new Error("La categoría no tiene una lista publicada.");

  return publicadas.map((registro) =>
    registro === configuracion ? { ...registro, fechaPublicacion: fecha } : registro
  );
}

module.exports = { RUTA_PUBLICADAS, leerPublicadas, escribirPublicadas, publicarCategoria, actualizarFechaPublicada };
