(function (global) {
  const TIPOS_REDONDEO = Object.freeze({
    SIN_REDONDEO: "sin-redondeo",
    ENTERO_SUPERIOR: "entero-superior",
    MULTIPLO_10: "multiplo-10",
    MULTIPLO_100: "multiplo-100",
    MULTIPLO_1000: "multiplo-1000",
  });

  const MULTIPLOS_POR_TIPO = Object.freeze({
    [TIPOS_REDONDEO.ENTERO_SUPERIOR]: 1,
    [TIPOS_REDONDEO.MULTIPLO_10]: 10,
    [TIPOS_REDONDEO.MULTIPLO_100]: 100,
    [TIPOS_REDONDEO.MULTIPLO_1000]: 1000,
  });

  const REDONDEO_POR_CATEGORIA = Object.freeze({
    Moldes: TIPOS_REDONDEO.ENTERO_SUPERIOR,
  });

  function obtenerTipoRedondeo(categoria) {
    return REDONDEO_POR_CATEGORIA[categoria] || TIPOS_REDONDEO.SIN_REDONDEO;
  }

  function aplicarRedondeo(valor, tipoRedondeo = TIPOS_REDONDEO.SIN_REDONDEO) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return valor;

    const multiplo = MULTIPLOS_POR_TIPO[tipoRedondeo];
    if (!multiplo) return numero;

    // Equivale a REDONDEAR.MAS(valor; 0 o -n) para precios no negativos.
    return Math.ceil(numero / multiplo) * multiplo;
  }

  function aplicarRedondeoComercial(valor) {
    return aplicarRedondeo(valor, TIPOS_REDONDEO.ENTERO_SUPERIOR);
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

    return {
      precioCalculado,
      precioFinal: aplicarRedondeo(
        precioCalculado,
        obtenerTipoRedondeo(categoria)
      ),
    };
  }

  function obtenerPrecioCalculado(producto) {
    if (producto.precioCalculado !== null && producto.precioCalculado !== "") {
      const precioCalculado = Number(producto.precioCalculado);
      if (Number.isFinite(precioCalculado)) return precioCalculado;
    }

    if (producto.precioNuevo !== null && producto.precioNuevo !== "") {
      const precioNuevo = Number(producto.precioNuevo);
      if (Number.isFinite(precioNuevo)) return precioNuevo;
    }

    return Number(producto.precioActual);
  }

  function obtenerPrecioPublicado(producto) {
    const tipoRedondeoAutomatico = obtenerTipoRedondeo(producto.categoria);
    if (tipoRedondeoAutomatico !== TIPOS_REDONDEO.SIN_REDONDEO) {
      return aplicarRedondeo(
        obtenerPrecioCalculado(producto),
        tipoRedondeoAutomatico
      );
    }

    if (producto.precioPublicado !== null && producto.precioPublicado !== "") {
      const precioPublicado = Number(producto.precioPublicado);
      if (Number.isFinite(precioPublicado)) return precioPublicado;
    }
    return obtenerPrecioCalculado(producto);
  }

  function aplicarRedondeoAProducto(producto) {
    const precioCalculado = obtenerPrecioCalculado(producto);
    return {
      ...producto,
      precioCalculado,
      precioPublicado: aplicarRedondeoComercial(precioCalculado),
    };
  }

  function quitarRedondeoAProducto(producto) {
    const actualizado = { ...producto };
    delete actualizado.precioPublicado;
    return actualizado;
  }

  function aplicarEdicionIndividual(producto, cambios) {
    const actualizado = { ...producto, ...cambios };

    if (Object.prototype.hasOwnProperty.call(cambios, "precioActual")) {
      actualizado.precioNuevo = cambios.precioActual;
      actualizado.precioCalculado = cambios.precioActual;
      delete actualizado.precioPublicado;
    }

    return actualizado;
  }

  function obtenerPorcentajeManual(producto) {
    if (producto.porcentaje === null || producto.porcentaje === "") return null;
    const porcentaje = Number(producto.porcentaje);
    return Number.isFinite(porcentaje) ? porcentaje : null;
  }

  function obtenerPrecioVigente(producto) {
    return obtenerPrecioCalculado(producto);
  }

  function aplicarAumentoMasivo(producto, tipoAumento, valorAumento, precioNuevo) {
    const actualizado = {
      ...producto,
      tipoAumento,
      valorAumento,
      precioActual: precioNuevo,
      precioNuevo,
      precioCalculado: precioNuevo,
      ...(tipoAumento === "porcentaje" ? { porcentaje: valorAumento } : {}),
    };
    delete actualizado.precioPublicado;
    return actualizado;
  }

  const api = {
    TIPOS_REDONDEO,
    aplicarRedondeo,
    aplicarRedondeoComercial,
    aplicarRedondeoAProducto,
    quitarRedondeoAProducto,
    aplicarEdicionIndividual,
    aplicarAumentoMasivo,
    calcularPrecio,
    obtenerPrecioVigente,
    obtenerPrecioCalculado,
    obtenerPrecioPublicado,
    obtenerTipoRedondeo,
    obtenerPorcentajeManual,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PricingLASA = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
