(function (global) {
  function aplicarRedondeoComercial(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return valor;

    // Equivale a REDONDEAR.MAS(valor; 0) para los precios no negativos.
    return Math.ceil(numero);
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
      // Se conserva por compatibilidad con los consumidores actuales. Ya no
      // incluye ninguna transformación comercial.
      precioFinal: precioCalculado,
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
    aplicarRedondeoComercial,
    aplicarRedondeoAProducto,
    quitarRedondeoAProducto,
    aplicarEdicionIndividual,
    aplicarAumentoMasivo,
    calcularPrecio,
    obtenerPrecioVigente,
    obtenerPrecioCalculado,
    obtenerPrecioPublicado,
    obtenerPorcentajeManual,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.PricingLASA = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
