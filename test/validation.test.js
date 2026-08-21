const test = require("node:test");
const assert = require("node:assert/strict");
const {
  esNumeroNoNegativo,
  leerNumeroOpcional,
  validarProducto,
} = require("../public/validation.js");
const { validarProductos } = require("../server.js");

const productoSinMedidas = {
  nombre: "Base especial",
  categoria: "Cartonería",
  seccion: "otros-carton",
  precioActual: 0,
  precioNuevo: 0,
  porcentaje: 0,
  ancho: null,
  largo: null,
  fuelle: null,
  unidadesPorBulto: null,
};

test("el precio cero es válido en frontend y backend", () => {
  assert.equal(esNumeroNoNegativo(0), true);
  assert.equal(validarProducto(productoSinMedidas), null);
  assert.equal(validarProductos([productoSinMedidas]), null);
});

test("null, undefined, NaN y los precios negativos son inválidos", () => {
  for (const precioActual of [null, undefined, NaN, -0.01]) {
    assert.match(
      validarProducto({ ...productoSinMedidas, precioActual }),
      /precio/
    );
  }
});

test("los productos sin medidas aceptan cada campo físico vacío", () => {
  for (const campo of ["ancho", "largo", "fuelle", "unidadesPorBulto"]) {
    assert.equal(
      validarProducto({ ...productoSinMedidas, [campo]: null }),
      null,
      campo
    );
  }
  assert.equal(
    validarProducto({
      nombre: "Artículo libre",
      categoria: "Productos sin medidas",
      precioActual: 12,
      porcentaje: 5,
    }),
    null
  );
});

test("un producto sin medidas mantiene obligatorios nombre, precio y porcentaje", () => {
  assert.match(validarProducto({ ...productoSinMedidas, nombre: "" }), /nombre/);
  assert.match(validarProducto({ ...productoSinMedidas, precioActual: null }), /precio/);
  assert.match(validarProducto({ ...productoSinMedidas, porcentaje: null }), /porcentaje/);
});

test("las bolsas conservan sus validaciones de medidas y unidades", () => {
  const bolsa = {
    nombre: "10 x 20",
    categoria: "Bolsas Kraft",
    ancho: "10",
    largo: "20",
    fuelle: "5",
    unidadesPorBulto: 1000,
    precioActual: 0,
    precioNuevo: 0,
  };
  assert.equal(validarProducto(bolsa), null);
  assert.match(validarProducto({ ...bolsa, ancho: "" }), /ancho/);
  assert.match(validarProducto({ ...bolsa, largo: "" }), /ancho/);
  assert.match(validarProducto({ ...bolsa, fuelle: "" }), /ancho/);
  assert.match(validarProducto({ ...bolsa, unidadesPorBulto: null }), /unidades/);
});

test("los inputs numéricos opcionales vacíos se guardan como null, no como cero", () => {
  assert.equal(leerNumeroOpcional(""), null);
  assert.equal(leerNumeroOpcional("  "), null);
  assert.equal(leerNumeroOpcional("0"), 0);
});
