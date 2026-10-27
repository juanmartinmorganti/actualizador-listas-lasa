const fs = require("node:fs");
const { leerProductos, validarProductos } = require("../server");
const { RUTA_PUBLICADAS, escribirPublicadas, publicarCategoria } = require("../publicaciones");

if (fs.existsSync(RUTA_PUBLICADAS)) {
  console.error("Ya existe un catálogo publicado. No se sobrescribió.");
  process.exitCode = 1;
} else {
  const borrador = leerProductos();
  const error = validarProductos(borrador);
  if (error) throw new Error(`El catálogo actual no pasó la validación: ${error}`);
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const categorias = [...new Set(borrador.filter((registro) => registro.tipoRegistro !== "configuracion").map((registro) => registro.categoria))];
  let publicadas = [];
  for (const categoria of categorias) {
    publicadas = publicarCategoria(borrador, publicadas, categoria, fecha);
  }
  escribirPublicadas(publicadas);
  console.log(`Catálogo público inicial creado: ${categorias.length} categorías, fecha ${fecha}.`);
}
