const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { publicarCategoria, escribirPublicadas, leerPublicadas, actualizarFechaPublicada } = require("../publicaciones");

const borrador = [
  { categoria: "Moldes", nombre: "Molde", precioActual: 120 },
  { categoria: "Moldes", tipoRegistro: "configuracion", fechaPublicacion: "2026-09-01" },
  { categoria: "Papeles", nombre: "Papel", precioActual: 30 },
  { categoria: "Papeles", tipoRegistro: "configuracion", fechaPublicacion: "2026-09-01" },
];

test("editar un borrador no cambia el catálogo publicado", () => {
  const primera = publicarCategoria(borrador, [], "Moldes", "2026-10-20");
  const modificados = structuredClone(borrador);
  modificados[0].precioActual = 200;
  assert.equal(primera.find((registro) => registro.nombre === "Molde").precioActual, 120);
  const segunda = publicarCategoria(modificados, primera, "Moldes", "2026-10-21");
  assert.equal(segunda.find((registro) => registro.nombre === "Molde").precioActual, 200);
  assert.equal(primera.find((registro) => registro.nombre === "Molde").precioActual, 120);
  assert.equal(segunda.find((registro) => registro.tipoRegistro === "configuracion").fechaPublicacion, "2026-10-21");
});

test("publicar una categoría no altera otra y exige productos y configuración", () => {
  const primera = publicarCategoria(borrador, [], "Papeles", "2026-10-20");
  const segunda = publicarCategoria(borrador, primera, "Moldes", "2026-10-20");
  assert.equal(segunda.filter((registro) => registro.categoria === "Papeles").length, 2);
  assert.throws(() => publicarCategoria(borrador, segunda, "No existe", "2026-10-20"), /no tiene productos/);
});

test("cambiar la fecha pública conserva los precios publicados y no copia el borrador", () => {
  const inicial = publicarCategoria(borrador, [], "Moldes", "2026-10-20");
  const modificados = structuredClone(borrador);
  modificados[0].precioActual = 999;
  const actualizado = actualizarFechaPublicada(inicial, "Moldes", "2026-10-19");
  assert.equal(actualizado.find((registro) => registro.nombre === "Molde").precioActual, 120);
  assert.equal(actualizado.find((registro) => registro.tipoRegistro === "configuracion").fechaPublicacion, "2026-10-19");
  assert.equal(inicial.find((registro) => registro.tipoRegistro === "configuracion").fechaPublicacion, "2026-10-20");
  assert.equal(modificados[0].precioActual, 999);
  assert.throws(() => actualizarFechaPublicada(inicial, "Papeles", "2026-10-19"), /no tiene una lista publicada/);
});

test("guarda y lee una copia pública separada del borrador", (t) => {
  const dir = fs.mkdtempSync("/tmp/opencode/publicaciones-lasa-");
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const ruta = path.join(dir, "publicadas.json");
  escribirPublicadas(publicarCategoria(borrador, [], "Moldes", "2026-10-20"), ruta);
  assert.equal(leerPublicadas(ruta).find((registro) => registro.nombre === "Molde").precioActual, 120);
});
