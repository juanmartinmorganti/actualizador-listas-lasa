const test = require("node:test");
const assert = require("node:assert/strict");
const { validarProductos } = require("../server.js");

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
