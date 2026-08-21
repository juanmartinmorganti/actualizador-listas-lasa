(function (global) {
  const CATEGORIAS_SIN_MEDIDAS = Object.freeze([
    "Otros artículos de cartón",
    "Productos sin medidas",
  ]);

  function esProductoSinMedidas(producto) {
    return (
      CATEGORIAS_SIN_MEDIDAS.includes(producto?.categoria) ||
      (producto?.categoria === "Cartonería" && producto?.seccion === "otros-carton")
    );
  }

  function esNumeroNoNegativo(valor) {
    return (
      valor !== null &&
      valor !== undefined &&
      valor !== "" &&
      typeof valor === "number" &&
      Number.isFinite(valor) &&
      valor >= 0
    );
  }

  function esEnteroPositivo(valor) {
    return Number.isInteger(valor) && valor > 0;
  }

  function leerNumeroOpcional(valor) {
    if (valor === null || valor === undefined || String(valor).trim() === "") {
      return null;
    }
    return Number(valor);
  }

  function validarProducto(producto) {
    if (!producto || typeof producto !== "object" || Array.isArray(producto)) {
      return "El producto no es válido.";
    }
    if (typeof producto.categoria !== "string" || !producto.categoria.trim()) {
      return "Seleccioná una categoría válida.";
    }
    if (typeof producto.nombre !== "string" || !producto.nombre.trim()) {
      return "Completá el nombre del producto.";
    }
    if (!esNumeroNoNegativo(producto.precioActual)) {
      return "Completá producto y precio con valores válidos.";
    }
    if (
      Object.prototype.hasOwnProperty.call(producto, "precioNuevo") &&
      !esNumeroNoNegativo(producto.precioNuevo)
    ) {
      return "Completá producto y precio con valores válidos.";
    }

    if (esProductoSinMedidas(producto)) {
      if (!esNumeroNoNegativo(producto.porcentaje)) {
        return "Ingresá un porcentaje válido.";
      }
      return null;
    }

    if (
      producto.categoria === "Moldes" ||
      producto.categoria === "Platos Dorados" ||
      (producto.categoria === "Servilletas" && producto.seccion === "productos")
    ) {
      if (!esNumeroNoNegativo(producto.porcentaje)) {
        return "Ingresá un porcentaje válido.";
      }
    }

    if (producto.categoria === "Bolsas Fast Food") {
      if (typeof producto.medida !== "string" || !producto.medida.trim()) {
        return "Completá la medida con un valor válido.";
      }
      if (!esEnteroPositivo(producto.unidadesPorCaja)) {
        return "Ingresá una cantidad de unidades por caja válida.";
      }
    }

    if (["Bolsas Blanca Extra", "Bolsas Blanca II", "Bolsas Kraft"].includes(producto.categoria)) {
      if (![producto.ancho, producto.largo, producto.fuelle].every((valor) => typeof valor === "string" && valor.trim())) {
        return "Completá ancho, largo y fuelle con valores válidos.";
      }
      if (!esEnteroPositivo(producto.unidadesPorBulto)) {
        return "Ingresá una cantidad de unidades por bulto válida.";
      }
    }

    if (producto.categoria === "Cartonería") {
      const esRedonda = producto.seccion?.endsWith("-redondas");
      if (esRedonda ? !producto.diametro?.trim() : !producto.ancho?.trim() || !producto.largo?.trim()) {
        return "Completá las medidas correspondientes a la sección.";
      }
      if (!esEnteroPositivo(producto.unidadesPorBulto)) {
        return "Ingresá una cantidad de unidades por bulto válida.";
      }
    }

    return null;
  }

  const api = {
    CATEGORIAS_SIN_MEDIDAS,
    esProductoSinMedidas,
    esNumeroNoNegativo,
    leerNumeroOpcional,
    validarProducto,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.ValidacionProductosLASA = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
