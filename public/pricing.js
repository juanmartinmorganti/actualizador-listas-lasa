(function (global) {
  const configuracionPreciosPorCategoria = Object.freeze({
    "Bolsas Blanca Extra": Object.freeze({
      rounding: Object.freeze({
        mode: "ceil",
        multiple: 10,
        operations: Object.freeze(["porcentaje"]),
      }),
    }),
    "Bolsas Blanca II": Object.freeze({
      rounding: Object.freeze({
        mode: "ceil",
        multiple: 10,
        operations: Object.freeze([
          "porcentaje",
          "descuento-porcentaje",
        ]),
      }),
    }),
  });

  function aplicarRedondeo(valor, configuracion) {
    if (!configuracion) return valor;

    if (configuracion.mode === "ceil") {
      return Math.ceil(valor / configuracion.multiple) * configuracion.multiple;
    }

    return valor;
  }

  function calcularPrecio(precioActual, tipoAumento, valorAumento, categoria) {
    let precioCalculado = precioActual;

    if (tipoAumento === "porcentaje") {
      precioCalculado = precioActual * (1 + valorAumento / 100);
    } else if (tipoAumento === "importe") {
      precioCalculado = precioActual + valorAumento;
    } else if (tipoAumento === "descuento-porcentaje") {
      precioCalculado = precioActual * (1 - valorAumento / 100);
    } else if (tipoAumento === "descuento-importe") {
      precioCalculado = Math.max(0, precioActual - valorAumento);
    }

    const configuracionRedondeo =
      configuracionPreciosPorCategoria[categoria]?.rounding;
    const rounding = configuracionRedondeo?.operations.includes(tipoAumento)
      ? configuracionRedondeo
      : undefined;

    return {
      precioCalculado,
      precioFinal: aplicarRedondeo(precioCalculado, rounding),
    };
  }

  const api = {
    configuracionPreciosPorCategoria,
    aplicarRedondeo,
    calcularPrecio,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PricingLASA = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
