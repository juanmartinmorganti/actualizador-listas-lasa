const test = require("node:test");
const assert = require("node:assert/strict");
const {
  aplicarEdicionIndividual,
  aplicarAumentoMasivo,
  aplicarRedondeoComercial,
  aplicarRedondeoAProducto,
  quitarRedondeoAProducto,
  calcularPrecio,
  obtenerPrecioCalculado,
  obtenerPrecioPublicado,
  obtenerPrecioVigente,
  obtenerPorcentajeManual,
} = require("../public/pricing.js");

test("el aumento porcentual conserva exactamente el resultado sin redondear", () => {
  const resultado = calcularPrecio(31933, "porcentaje", 10, "Bolsas Blanca Extra");
  assert.ok(Math.abs(resultado.precioCalculado - 35126.3) < 1e-9);
  assert.equal(resultado.precioFinal, resultado.precioCalculado);
});

test("el redondeo comercial replica REDONDEAR.MAS a cero decimales", () => {
  assert.equal(aplicarRedondeoComercial(35126.3), 35127);
  assert.equal(aplicarRedondeoComercial(35127), 35127);
});

test("aplicar y quitar redondeo conserva siempre el precio calculado", () => {
  const exacto = { precioNuevo: 35126.3, precioCalculado: 35126.3 };
  const redondeado = aplicarRedondeoAProducto(exacto);
  assert.equal(redondeado.precioCalculado, 35126.3);
  assert.equal(redondeado.precioPublicado, 35127);
  assert.equal(obtenerPrecioPublicado(redondeado), 35127);

  const restaurado = quitarRedondeoAProducto(redondeado);
  assert.equal(restaurado.precioCalculado, 35126.3);
  assert.equal(obtenerPrecioPublicado(restaurado), 35126.3);
});

test("las listas anteriores sin campos nuevos mantienen compatibilidad", () => {
  const legado = { precioActual: 100, precioNuevo: 121 };
  assert.equal(obtenerPrecioCalculado(legado), 121);
  assert.equal(obtenerPrecioPublicado(legado), 121);
});

test("la misma función cubre cálculo individual y masivo", () => {
  const individual = calcularPrecio(
    19850,
    "porcentaje",
    6,
    "Bolsas Blanca Extra"
  );
  const masivo = [19850, 21570].map(
    (precio) =>
      calcularPrecio(
        precio,
        "porcentaje",
        6,
        "Bolsas Blanca Extra"
      ).precioFinal
  );

  assert.equal(individual.precioCalculado, 21041);
  assert.equal(individual.precioFinal, 21041);
  assert.deepEqual(masivo, [21041, 22864.2]);
});

test("las categorías sin configuración conservan el resultado matemático exacto", () => {
  for (const categoria of [
    "Bolsas Fast Food",
    "Bolsas Kraft",
    "Cartonería",
    "Moldes",
    "Papeles",
    "Platos Dorados",
    "Servilletas",
  ]) {
    assert.equal(
      calcularPrecio(19850, "porcentaje", 6, categoria).precioFinal,
      21041
    );
  }
});

test("el cálculo de importes fijos sigue sin redondeo", () => {
  assert.equal(
    calcularPrecio(19850, "importe", 1, "Bolsas Blanca Extra").precioFinal,
    19851
  );
});

test("los descuentos porcentuales conservan el resultado exacto", () => {
  assert.equal(
    calcularPrecio(
      18750,
      "descuento-porcentaje",
      6,
      "Bolsas Blanca Extra"
    ).precioFinal,
    17625
  );
});

test("editar el porcentaje individual no recalcula el precio", () => {
  const original = {
    precioActual: 21.5,
    precioNuevo: 21.5,
    porcentaje: 6,
    tipoAumento: "porcentaje",
    valorAumento: 6,
  };

  const actualizado = aplicarEdicionIndividual(original, { porcentaje: 10 });

  assert.equal(actualizado.precioActual, 21.5);
  assert.equal(actualizado.precioNuevo, 21.5);
  assert.equal(actualizado.porcentaje, 10);
  assert.equal(actualizado.valorAumento, 6);
});

test("editar el precio individual conserva el porcentaje", () => {
  const original = {
    precioActual: 21.5,
    precioNuevo: 21.5,
    porcentaje: 6,
  };

  const actualizado = aplicarEdicionIndividual(original, { precioActual: 25 });

  assert.equal(actualizado.precioActual, 25);
  assert.equal(actualizado.precioNuevo, 25);
  assert.equal(actualizado.porcentaje, 6);
});

test("el aumento masivo conserva el cálculo porcentual existente", () => {
  const resultado = calcularPrecio(21.5, "porcentaje", 5, "Bolsas Kraft");

  assert.equal(resultado.precioCalculado, 22.575);
  assert.equal(resultado.precioFinal, 22.575);
});

test("edición, vista previa y publicación comparten el porcentaje manual", () => {
  const original = {
    precioActual: 100,
    precioNuevo: 100,
    tipoAumento: "porcentaje",
    valorAumento: 20,
  };

  const guardado = aplicarEdicionIndividual(original, { porcentaje: 5 });

  assert.equal(guardado.porcentaje, 5);
  assert.equal(obtenerPorcentajeManual(guardado), 5);
  assert.equal(guardado.valorAumento, 20);
});

test("el porcentaje manual no usa el aumento calculado como fallback", () => {
  assert.equal(
    obtenerPorcentajeManual({ tipoAumento: "porcentaje", valorAumento: 5 }),
    null
  );
});

test("el aumento masivo porcentual mantiene su comportamiento y sincroniza la fuente común", () => {
  const original = { precioActual: 100, precioNuevo: 100, porcentaje: 2, precioPublicado: 100 };
  const actualizado = aplicarAumentoMasivo(original, "porcentaje", 5, 105);

  assert.equal(actualizado.precioNuevo, 105);
  assert.equal(actualizado.tipoAumento, "porcentaje");
  assert.equal(actualizado.valorAumento, 5);
  assert.equal(actualizado.porcentaje, 5);
  assert.equal(actualizado.precioCalculado, 105);
  assert.equal(Object.hasOwn(actualizado, "precioPublicado"), false);
  assert.equal(obtenerPorcentajeManual(actualizado), 5);
});

test("un aumento masivo no porcentual no recalcula el porcentaje manual", () => {
  const actualizado = aplicarAumentoMasivo(
    { precioActual: 100, precioNuevo: 100, porcentaje: 7 },
    "importe",
    10,
    110
  );

  assert.equal(actualizado.precioNuevo, 110);
  assert.equal(actualizado.porcentaje, 7);
});

test("los aumentos masivos sucesivos parten siempre del precio vigente", () => {
  let producto = {
    precioActual: 26387.71,
    precioNuevo: 26387.71,
    porcentaje: 0,
  };
  const preciosEsperados = [29026.481, 31929.1291, 35122.04201];

  for (const precioEsperado of preciosEsperados) {
    const base = obtenerPrecioVigente(producto);
    const { precioFinal } = calcularPrecio(
      base,
      "porcentaje",
      10,
      "Bolsas Kraft"
    );
    producto = aplicarAumentoMasivo(producto, "porcentaje", 10, precioFinal);

    assert.ok(Math.abs(producto.precioNuevo - precioEsperado) < 1e-9);
    assert.equal(producto.precioActual, producto.precioNuevo);
  }

  assert.equal(producto.precioNuevo.toFixed(2), "35122.04");
});

test("el precio vigente prioriza el último precio publicado", () => {
  assert.equal(
    obtenerPrecioVigente({ precioActual: 100, precioNuevo: 121 }),
    121
  );
  assert.equal(obtenerPrecioVigente({ precioActual: 100 }), 100);
});
