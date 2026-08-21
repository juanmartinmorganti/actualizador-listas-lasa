const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const script = fs.readFileSync(
  path.join(__dirname, "..", "public", "script.js"),
  "utf8"
);

function cuerpoFuncion(nombre, siguienteNombre) {
  const inicio = script.indexOf(`function ${nombre}`);
  const fin = script.indexOf(`function ${siguienteNombre}`, inicio);
  assert.notEqual(inicio, -1, `No se encontró ${nombre}`);
  assert.notEqual(fin, -1, `No se encontró el límite de ${nombre}`);
  return script.slice(inicio, fin);
}

test("editar y cancelar actualizan sólo el renglón", () => {
  const editar = cuerpoFuncion("editarProducto", "cancelarEdicionInline");
  const cancelar = cuerpoFuncion("cancelarEdicionInline", "actualizarFilaProducto");
  assert.match(editar, /actualizarFilaProducto/);
  assert.doesNotMatch(editar, /renderizarTabla/);
  assert.match(cancelar, /actualizarFilaProducto/);
  assert.doesNotMatch(cancelar, /renderizarTabla/);
});

test("guardar no reconstruye las listas y conserva el scroll", () => {
  const guardar = cuerpoFuncion("guardarEdicionInline", "eliminarProducto");
  assert.doesNotMatch(guardar, /renderizarTabla|renderizarListaPorCategoria/);
  assert.match(guardar, /scrollAnterior/);
  assert.match(guardar, /Guardando\.\.\./);
  assert.match(guardar, /actualizarFilaProducto\(index, false\)/);
});

test("el error conserva los inputs y vuelve a habilitar Guardar", () => {
  const guardar = cuerpoFuncion("guardarEdicionInline", "eliminarProducto");
  assert.match(guardar, /productos\[index\] = original/);
  assert.match(guardar, /botonGuardar\.disabled = false/);
  assert.doesNotMatch(guardar, /fila\.innerHTML[\s\S]*guardarProductos/);
});

test("acciones normales y de edición comparten un contenedor estable", () => {
  const accionesNormales = cuerpoFuncion("crearAccionesProducto", "crearCeldasVisualizacionProducto");
  const accionesEdicion = cuerpoFuncion("crearAccionesEdicion", "crearCeldasEdicionProducto");
  assert.match(accionesNormales, /acciones-producto-inline/);
  assert.match(accionesEdicion, /acciones-producto-inline/);

  const estilos = fs.readFileSync(
    path.join(__dirname, "..", "public", "style.css"),
    "utf8"
  );
  assert.match(estilos, /\.acciones-producto-inline\s*\{[\s\S]*?display:\s*flex/);
  assert.match(estilos, /\.acciones-producto-inline\s*\{[\s\S]*?flex-wrap:\s*nowrap/);
  assert.match(estilos, /\.acciones-producto-inline button\s*\{[\s\S]*?white-space:\s*nowrap/);
});

test("tablas, precios y filas editables tienen dimensiones estables", () => {
  const estilos = fs.readFileSync(
    path.join(__dirname, "..", "public", "style.css"),
    "utf8"
  );
  assert.match(estilos, /table\s*\{[^}]*table-layout:\s*fixed/);
  assert.match(estilos, /\.precio-final,[\s\S]*?\.celda-precio\s*\{[^}]*white-space:\s*nowrap/);
  assert.match(estilos, /\.tabla-productos-admin th,[\s\S]*?height:\s*65px/);
  assert.match(estilos, /\.tabla-productos-admin th:last-child,[\s\S]*?width:\s*198px/);
  assert.match(estilos, /\.input-edicion-inline\s*\{[^}]*min-width:\s*0/);
});
