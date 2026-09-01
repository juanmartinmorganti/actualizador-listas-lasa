const test = require("node:test");
const assert = require("node:assert/strict");
const { crearDocumentoPdf, validarProductos, validarSolicitudPdf } = require("../server.js");

test("acepta productos y configuraciones con categoría", () => {
  assert.equal(
    validarProductos([
      { nombre: "Producto", categoria: "Papeles", precioActual: 10 },
      { tipoRegistro: "configuracion", categoria: "Papeles" },
    ]),
    null
  );
});

test("rechaza cuerpos que no son listas", () => {
  assert.match(validarProductos({}), /array/);
});

test("rechaza registros sin una categoría válida", () => {
  assert.match(validarProductos([{ nombre: "Producto" }]), /categoría/);
  assert.match(validarProductos([null]), /categoría/);
});

test("valida solicitudes de PDF", () => {
  assert.equal(validarSolicitudPdf({ html: "<article>Lista</article>", tipo: "catalogo" }), null);
  assert.match(validarSolicitudPdf({ html: "", tipo: "catalogo" }), /contenido/);
  assert.match(validarSolicitudPdf({ html: "<p>Lista</p>", tipo: "otro" }), /tipo/);
});

test("el documento PDF reutiliza la hoja de estilos y activa el modo solicitado", () => {
  const documento = crearDocumentoPdf("<article>Catálogo</article>", "catalogo", "http://127.0.0.1:4000");
  assert.match(documento, /href="style\.css"/);
  assert.match(documento, /body class="vista-catalogo"/);
  assert.match(documento, /<article>Catálogo<\/article>/);
});
