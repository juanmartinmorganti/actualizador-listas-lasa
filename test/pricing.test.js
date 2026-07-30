const test = require("node:test");
const assert = require("node:assert/strict");
const {
  aplicarRedondeo,
  calcularPrecio,
} = require("../public/pricing.js");

const casosBlancaExtra = [
  [19850, 6, 21050],
  [21570, 6, 22870],
  [23900, 6, 25340],
  [26970, 6, 28590],
  [33770, 6, 35800],
  [38550, 6, 40870],
];

test("Blanca Extra aplica porcentaje y redondea siempre hacia arriba a 10", () => {
  for (const [precio, porcentaje, esperado] of casosBlancaExtra) {
    assert.equal(
      calcularPrecio(
        precio,
        "porcentaje",
        porcentaje,
        "Bolsas Blanca Extra"
      ).precioFinal,
      esperado
    );
  }
});

test("Blanca II aplica porcentaje y redondea siempre hacia arriba a 10", () => {
  const casos = [
    [17290, 18330],
    [18750, 19880],
    [20080, 21290],
    [21070, 22340],
    [36560, 38760],
    [61420, 65110],
  ];

  for (const [precio, esperado] of casos) {
    assert.equal(
      calcularPrecio(
        precio,
        "porcentaje",
        6,
        "Bolsas Blanca II"
      ).precioFinal,
      esperado
    );
  }
});

test("Blanca II también redondea descuentos porcentuales después del cálculo", () => {
  const resultado = calcularPrecio(
    18750,
    "descuento-porcentaje",
    6,
    "Bolsas Blanca II"
  );

  assert.equal(resultado.precioCalculado, 17625);
  assert.equal(resultado.precioFinal, 17630);
});

test("mantiene resultados que ya son múltiplos de 10", () => {
  assert.equal(aplicarRedondeo(21050, { mode: "ceil", multiple: 10 }), 21050);
  assert.equal(aplicarRedondeo(40000, { mode: "ceil", multiple: 10 }), 40000);
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
  assert.equal(individual.precioFinal, 21050);
  assert.deepEqual(masivo, [21050, 22870]);
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

test("el redondeo no se aplica a importes fijos", () => {
  assert.equal(
    calcularPrecio(19850, "importe", 1, "Bolsas Blanca Extra").precioFinal,
    19851
  );
});

test("Blanca Extra conserva su comportamiento para descuentos porcentuales", () => {
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
