// Plantillas comerciales copiadas de public/script.js. La prueba de paridad detecta divergencias.
// Ninguna plantilla ni dato HTML proviene de la solicitud HTTP.
const PricingLASA = require("./public/pricing.js");
function crearPlantilla(productos, fechaGeneracion, esBorrador = false) {
const ordenCatalogo = [
  "Bolsas Fast Food",
  "Bolsas Blanca Extra",
  "Bolsas Blanca II",
  "Bolsas Kraft",
  "Cartonería",
  "Moldes",
  "Papeles",
  "Platos Dorados",
  "Servilletas",
];
const configuracionCatalogo = {
  incluirPortada: true,
  incluirIndice: true,
};

function crearMarcaInstitucional(titulo, variante = "") {
  const claseLogo = variante
    ? `logo-lasa logo-lasa--${variante}`
    : "logo-lasa";

  return `
    <img
      class="${claseLogo}"
      src="/assets/logo-lasa.png"
      alt="Logo de Lorenzo Annecchini S.A."
      width="64"
      height="64"
    />
    <div class="marca-institucional__texto">
      <p class="empresa">Lorenzo Annecchini S.A.</p>
      <h1>${escaparHTML(titulo)}</h1>
    </div>
  `;
}

function obtenerPrecioPublicado(producto) {
  return PricingLASA.obtenerPrecioPublicado(producto);
}

function formatearMoneda(valor) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "—";
  }

  return `$ ${numero.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatearPrecioFinal(valor, categoria) {
  if (PricingLASA.obtenerTipoRedondeo(categoria) === PricingLASA.TIPOS_REDONDEO.SIN_REDONDEO) {
    return formatearMoneda(valor);
  }

  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return `$ ${numero.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function formatearPrecioPublicado(producto) {
  return formatearPrecioFinal(obtenerPrecioPublicado(producto), producto.categoria);
}

function formatearEntero(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "—";
  }
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "—";
  }

  return numero.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function esCategoriaFastFood(categoria) {
  return categoria === "Bolsas Fast Food";
}

function esCategoriaBolsaAmericana(categoria) {
  return (
    categoria === "Bolsas Blanca Extra" ||
    categoria === "Bolsas Blanca II" ||
    categoria === "Bolsas Kraft"
  );
}

function esCategoriaCartoneria(categoria) {
  return categoria === "Cartonería";
}

function esCategoriaMoldes(categoria) {
  return categoria === "Moldes";
}

function esCategoriaPapeles(categoria) {
  return categoria === "Papeles";
}

function esCategoriaPlatosDorados(categoria) {
  return categoria === "Platos Dorados";
}

function esCategoriaServilletas(categoria) {
  return categoria === "Servilletas";
}

function tieneBloqueImpresion(categoria) {
  return (
    esCategoriaServilletas(categoria) ||
    esCategoriaPapeles(categoria) ||
    categoria === "Papel" ||
    esCategoriaBolsaAmericana(categoria)
  );
}

function esRegistroConfiguracion(registro) {
  return registro.tipoRegistro === "configuracion";
}

function obtenerConfiguracionCategoria(categoria) {
  return productos.find(
    (registro) =>
      registro.categoria === categoria && esRegistroConfiguracion(registro)
  );
}

function obtenerFechaImpresion(categoria) {
  if (!tieneBloqueImpresion(categoria)) return "";

  const configuracion = obtenerConfiguracionCategoria(categoria);
  return (
    configuracion?.fechaPublicacionImpresion ||
    configuracion?.fechasSecciones?.impresion ||
    configuracion?.fechasSecciones?.["recargos-impresion"] ||
    obtenerFechaActualizacion(categoria)
  );
}

function obtenerProductosPublicados(categoria) {
  const configuracion = obtenerConfiguracionCategoria(categoria);
  return Array.isArray(configuracion?.productosPublicados)
    ? configuracion.productosPublicados
    : [];
}

function estaCategoriaPublicada(categoria) {
  if (!obtenerFechaActualizacion(categoria)) return false;
  if (esCategoriaFastFood(categoria)) {
    return obtenerProductosPublicados(categoria).length > 0;
  }
  return true;
}

function obtenerProductosDeCategoria(categoria) {
  return productos.filter(
    (producto) =>
      producto.categoria === categoria && !esRegistroConfiguracion(producto)
  );
}

function crearTablaFinalCategoria(categoria, productosCategoria, mostrarCategoria = true) {
  let contenido = `
    <div class="bloque-categoria">
      ${mostrarCategoria ? `<h3>${escaparHTML(categoria)}</h3>` : ""}
      <table>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio final</th>
          </tr>
        </thead>
        <tbody>
  `;

  productosCategoria.forEach((producto) => {
    contenido += `
      <tr>
        <td>${escaparHTML(producto.nombre)}</td>
        <td class="precio-final">${formatearMoneda(obtenerPrecioPublicado(producto))}</td>
      </tr>
    `;
  });

  contenido += `
        </tbody>
      </table>
    </div>
  `;

  return contenido;
}

function formatearPorcentajeManual(producto) {
  const porcentaje = PricingLASA.obtenerPorcentajeManual(producto);
  if (porcentaje === null) return "—";

  return `${porcentaje.toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })}%`;
}

function escaparHTML(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function crearTablaConfigurada(columnas, productosSeccion, categoria = "") {
  const encabezados = columnas
    .map(
      (columna) => `
        <th class="alinear-${columna.align}" style="width: ${columna.width}">
          ${escaparHTML(columna.label).replaceAll("\n", "<br>")}
        </th>
      `
    )
    .join("");

  const filas = productosSeccion
    .map(
      (producto) => `
        <tr>
          ${columnas
            .map((columna) => {
              const clase = columna.className ? ` ${columna.className}` : "";
              return `
                <td class="alinear-${columna.align}${clase}">
                  ${escaparHTML(columna.value(producto))}
                </td>
              `;
            })
            .join("")}
        </tr>
      `
    )
    .join("");

  return `
    <div class="tabla-lista-contenedor">
      <table class="tabla-lista-unificada">
      <thead>
        ${categoria ? `<tr class="encabezado-continuacion"><th colspan="${columnas.length}">${escaparHTML(obtenerTituloComercialCategoria(categoria))} · Lista de precios</th></tr>` : ""}
        <tr>${encabezados}</tr>
      </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function crearSeccionRecargos(categoria, recargos) {
  if (recargos.length === 0) {
    return "";
  }

  const fechaImpresion = obtenerFechaImpresion(categoria);

  const filas = recargos
    .map(
      (recargo) => `
        <tr>
          <td>${escaparHTML(recargo.descripcion)}</td>
          <td class="alinear-right precio-final">${escaparHTML(formatearMoneda(recargo.precioUnaCara))}</td>
          <td class="alinear-right precio-final">${escaparHTML(formatearMoneda(recargo.precioDosCaras))}</td>
        </tr>
      `
    )
    .join("");

  return `
    <section class="seccion-lista seccion-recargos">
      ${fechaImpresion ? `<p class="fecha-seccion fecha-seccion--impresion">Última actualización impresión: ${formatearFechaArgentina(fechaImpresion)}</p>` : ""}
      <h3>RECARGO POR IMPRESIÓN</h3>
      <div class="tabla-lista-contenedor">
        <table class="tabla-lista-unificada tabla-recargos">
          <thead><tr><th>TIPO DE IMPRESIÓN</th><th>1 CARA</th><th>2 CARAS</th></tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </section>
  `;
}

function crearListaConfigurada(categoria, productosCategoria, seccionesColapsables = false) {
  const configuracion = configuracionListas[categoria];

  if (!configuracion) {
    return crearTablaFinalCategoria(categoria, productosCategoria, false);
  }

  const secciones = configuracion.sections || [
    { title: "", matches: () => true },
  ];

  let contenido = secciones
    .map((seccion) => {
      const productosSeccion = productosCategoria.filter(seccion.matches);

      if (productosSeccion.length === 0) {
        return "";
      }

      const fechaImpresion = seccion.showImpressionDate
        ? obtenerFechaImpresion(categoria)
        : "";
      const encabezadoSeccion = `
        ${fechaImpresion ? `<p class="fecha-seccion fecha-seccion--impresion">Última actualización impresión: ${formatearFechaArgentina(fechaImpresion)}</p>` : ""}
        ${seccion.title ? `<h3>${escaparHTML(seccion.title)}</h3>` : ""}
        ${seccion.subtitle ? `<p class="subtitulo-seccion">${escaparHTML(seccion.subtitle)}</p>` : ""}
        ${
          seccion.showDate && obtenerConfiguracionCategoria(categoria)?.fechasSecciones?.[seccion.id]
            ? `<p class="fecha-seccion">Actualizado: ${formatearFechaArgentina(obtenerConfiguracionCategoria(categoria).fechasSecciones[seccion.id])}</p>`
            : ""
        }
      `;
      const tablaSeccion = crearTablaConfigurada(
        seccion.columns || configuracion.columns,
        productosSeccion,
        categoria
      );

      if (
        seccionesColapsables &&
        (
          esCategoriaCartoneria(categoria) ||
          esCategoriaPapeles(categoria) ||
          esCategoriaServilletas(categoria)
        )
      ) {
        return `
          <details class="seccion-lista seccion-lista-admin" open>
            <summary>${encabezadoSeccion}</summary>
            ${tablaSeccion}
          </details>
        `;
      }

      return `
        <section class="seccion-lista">
          ${encabezadoSeccion}
          ${tablaSeccion}
        </section>
      `;
    })
    .join("");

  if (esCategoriaBolsaAmericana(categoria)) {
    const recargos = obtenerConfiguracionCategoria(categoria)?.recargosImpresion || [];
    contenido += crearSeccionRecargos(categoria, recargos);
  }

  let nota = "";

  const notaComercial = configuracion.commercialNoteFromData
    ? obtenerConfiguracionCategoria(categoria)?.notaComercial
    : configuracion.commercialNote;

  if (notaComercial) {
    nota = `<p class="nota-lista nota-comercial">${escaparHTML(notaComercial)}</p>`;
    if (configuracion.percentageNote) {
      nota += `
        <p class="nota-lista">
          (*) Este porcentaje indica cuánto ha aumentado el precio respecto de la
          versión anterior de esta lista.
        </p>
      `;
    }
  } else if (configuracion.percentageNote) {
    nota = `
      <p class="nota-lista">
        (*) Este porcentaje indica cuánto ha aumentado el precio respecto de la
        versión anterior de esta lista.
      </p>
    `;
  }

  const introduccion = configuracion.introText
    ? `<p class="leyenda-lista">${escaparHTML(configuracion.introText)}</p>`
    : "";
  const clase = configuracion.className
    ? `lista-comercial ${configuracion.className}`
    : "lista-comercial";

  return `<div class="${clase}">${introduccion}${contenido}${nota}</div>`;
}

function obtenerTituloComercialCategoria(categoria) {
  if (categoria === "Bolsas Kraft") return "BOLSAS AMERICANAS · KRAFT II";
  if (categoria === "Bolsas Blanca Extra") return "BOLSAS AMERICANAS · BLANCA EXTRA";
  if (categoria === "Bolsas Blanca II") return "BOLSAS AMERICANAS · BLANCA II";
  return categoria.toLocaleUpperCase("es");
}

function crearPortadaCatalogo(categoriasIncluidas) {
  if (!configuracionCatalogo.incluirPortada) return "";

  const indice = configuracionCatalogo.incluirIndice
    ? `
      <div class="indice-catalogo">
        <h2>Categorías incluidas</h2>
        <ol>${categoriasIncluidas.map((categoria) => `<li>${escaparHTML(categoria)}</li>`).join("")}</ol>
      </div>
    `
    : "";

  return `
    <article class="catalogo-portada">
      <div class="marca-institucional marca-institucional--catalogo">
        ${crearMarcaInstitucional("Listas de Precios", "documento")}
      </div>
      <p class="catalogo-subtitulo">Catálogo completo</p>
      <p class="catalogo-generado">Generado el ${formatearFechaArgentina(obtenerFechaHoyISO())}</p>
      ${indice}
    </article>
  `;
}

function crearCategoriaCatalogo(categoria) {
  const fecha = obtenerFechaActualizacion(categoria);
  const productosCategoria = esCategoriaFastFood(categoria)
    ? obtenerProductosPublicados(categoria)
    : obtenerProductosDeCategoria(categoria);

  return `
    <article class="catalogo-categoria" data-categoria="${escaparHTML(categoria)}">
      <div class="encabezado-documento">
        <div class="marca-institucional marca-institucional--documento">
          ${crearMarcaInstitucional("Lista de Precios", "documento")}
        </div>
        <div class="datos-documento">
          <h2>${escaparHTML(obtenerTituloComercialCategoria(categoria))}</h2>
          <p>Fecha de publicación: ${formatearFechaArgentina(fecha)}</p>
        </div>
      </div>
      <div class="franja-institucional" aria-hidden="true"></div>
      ${crearListaConfigurada(categoria, productosCategoria)}
      <footer class="pie-documento">
        <span>Lorenzo Annecchini S.A.</span>
        <span class="numero-pagina-catalogo">Catálogo completo · Página</span>
      </footer>
    </article>
  `;
}

const configuracionListas = {
  "Bolsas Fast Food": {
    className: "lista-comercial--fast-food",
    introText: "PRECIOS EXPRESADOS POR UNIDAD",
    commercialNote: "COMPRA DE 5000 UNIDADES: 7% DE DESCUENTO",
    columns: [
      {
        label: "Artículo",
        value: (producto) => producto.nombre,
        align: "left",
        width: "18%",
      },
      {
        label: "Medida",
        value: (producto) => producto.medida,
        align: "center",
        width: "32%",
      },
      {
        label: "Unidades por caja",
        value: (producto) => formatearEntero(producto.unidadesPorCaja),
        align: "center",
        width: "25%",
      },
      {
        label: "Precio unitario",
        value: (producto) => formatearMoneda(obtenerPrecioPublicado(producto)),
        align: "right",
        width: "25%",
        className: "precio-final",
      },
    ],
  },
  "Bolsas Blanca Extra": {
    className: "lista-comercial--blanca-extra",
    columns: [
      { label: "NÚMERO", value: (p) => p.codigo || p.nombre, align: "center", width: "13%" },
      { label: "ANCHO\ncm", value: (p) => p.ancho, align: "center", width: "10%" },
      { label: "LARGO\ncm", value: (p) => p.largo, align: "center", width: "10%" },
      { label: "FUELLE\ncm", value: (p) => p.fuelle, align: "center", width: "10%" },
      { label: "UNIDADES POR BULTO", value: (p) => formatearEntero(p.unidadesPorBulto), align: "center", width: "20%" },
      { label: "$ POR MILLAR\n1.000", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "26%", className: "precio-final" },
      { label: "% (*)", value: formatearPorcentajeManual, align: "center", width: "11%" },
    ],
    percentageNote: true,
  },
  Moldes: {
    className: "lista-comercial--moldes",
    columns: [
      {
        label: "Descripción",
        value: (producto) => producto.descripcion || producto.nombre,
        align: "left",
        width: "58%",
      },
      {
        label: "Precio por millar",
        value: formatearPrecioPublicado,
        align: "right",
        width: "27%",
        className: "precio-final",
      },
      {
        label: "% (*)",
        value: formatearPorcentajeManual,
        align: "center",
        width: "15%",
      },
    ],
    percentageNote: true,
  },
  Servilletas: {
    columns: [
      {
        label: "Detalle",
        value: (producto) => producto.nombre,
        align: "left",
        width: "58%",
      },
      {
        label: "Precio",
        value: (producto) => formatearMoneda(obtenerPrecioPublicado(producto)),
        align: "right",
        width: "27%",
        className: "precio-final",
      },
      {
        label: "Porcentaje",
        value: formatearPorcentajeManual,
        align: "center",
        width: "15%",
      },
    ],
    sections: [
      {
        title: "Servilletas",
        matches: (producto) =>
          !producto.nombre.toLocaleLowerCase("es").startsWith("impresión") &&
          !producto.nombre.toLocaleLowerCase("es").includes("secamano"),
      },
      {
        title: "Recargos de impresión",
        matches: (producto) =>
          producto.nombre.toLocaleLowerCase("es").startsWith("impresión"),
      },
      {
        title: "Secamanos",
        matches: (producto) =>
          producto.nombre.toLocaleLowerCase("es").includes("secamano"),
      },
    ],
    percentageNote: true,
  },
};

configuracionListas["Bolsas Blanca II"] = {
  ...configuracionListas["Bolsas Blanca Extra"],
};
configuracionListas["Bolsas Kraft"] = {
  ...configuracionListas["Bolsas Blanca Extra"],
};
const columnasCartoneriaRectangular = [
  { label: "NÚMERO", value: (p) => p.numero, align: "center", width: "11%" },
  { label: "ANCHO\ncm", value: (p) => p.ancho, align: "center", width: "13%" },
  { label: "LARGO\ncm", value: (p) => p.largo, align: "center", width: "13%" },
  { label: "$ POR MILLAR\n1.000", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "28%", className: "precio-final" },
  { label: "UNIDADES POR BULTO", value: (p) => formatearEntero(p.unidadesPorBulto), align: "center", width: "22%" },
  { label: "% (*)", value: formatearPorcentajeManual, align: "center", width: "13%" },
];
const columnasCartoneriaRedonda = [
  { label: "NÚMERO", value: (p) => p.numero, align: "center", width: "14%" },
  { label: "DIÁMETRO\ncm", value: (p) => p.diametro, align: "center", width: "18%" },
  { label: "$ POR MILLAR\n1.000", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "28%", className: "precio-final" },
  { label: "UNIDADES POR BULTO", value: (p) => formatearEntero(p.unidadesPorBulto), align: "center", width: "25%" },
  { label: "% (*)", value: formatearPorcentajeManual, align: "center", width: "15%" },
];
configuracionListas.Cartonería = {
  className: "lista-comercial--cartoneria",
  percentageNote: true,
  sections: [
    { title: "BANDEJAS ECONÓMICAS", subtitle: "RECTANGULARES", id: "economicas-rectangulares", columns: columnasCartoneriaRectangular },
    { title: "BANDEJAS ECONÓMICAS", subtitle: "REDONDAS", id: "economicas-redondas", columns: columnasCartoneriaRedonda },
    { title: "BANDEJAS REFORZADAS", subtitle: "RECTANGULARES", id: "reforzadas-rectangulares", columns: columnasCartoneriaRectangular },
    { title: "BANDEJAS REFORZADAS", subtitle: "REDONDAS", id: "reforzadas-redondas", columns: columnasCartoneriaRedonda },
    { title: "BANDEJAS PESADAS", subtitle: "RECTANGULARES", id: "pesadas-rectangulares", columns: columnasCartoneriaRectangular },
    { title: "BANDEJAS PESADAS", subtitle: "REDONDAS", id: "pesadas-redondas", columns: columnasCartoneriaRedonda },
    {
      title: "OTROS ARTÍCULOS DE CARTÓN",
      subtitle: "",
      id: "otros-carton",
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "60%" },
        { label: "PRECIO", value: (p) => p.aCotizar ? "A cotizar" : formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "25%", className: "precio-final" },
        { label: "% (*)", value: formatearPorcentajeManual, align: "center", width: "15%" },
      ],
    },
  ].map((seccion) => ({
    ...seccion,
    matches: (producto) => producto.seccion === seccion.id,
  })),
};
configuracionListas.Papeles = {
  className: "lista-comercial--papeles",
  sections: [
    {
      id: "papeles-principales",
      title: "PAPELES",
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "42%" },
        { label: "FORMATOS / MEDIDAS", value: (p) => p.formato || "—", align: "center", width: "36%" },
        { label: "PRECIO", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "22%", className: "precio-final" },
      ],
    },
    {
      id: "recargos-impresion",
      title: "RECARGOS POR IMPRESIÓN",
      showImpressionDate: true,
      columns: [
        { label: "TIPO DE IMPRESIÓN", value: (p) => p.descripcion, align: "left", width: "65%" },
        { label: "PRECIO", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "35%", className: "precio-final" },
      ],
    },
    {
      id: "productos-importados",
      title: "PRODUCTOS IMPORTADOS",
      showDate: true,
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "42%" },
        { label: "FORMATO / DETALLE", value: (p) => p.formato || "—", align: "center", width: "36%" },
        { label: "PRECIO", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "22%", className: "precio-final" },
      ],
    },
  ].map((seccion) => ({
    ...seccion,
    matches: (producto) => producto.seccion === seccion.id,
  })),
};
configuracionListas["Platos Dorados"] = {
  className: "lista-comercial--platos-dorados",
  introText: "CONFITERÍAS – TORTAS – PASTELERÍA",
  commercialNoteFromData: true,
  percentageNote: true,
  columns: [
    { label: "MEDIDA", value: (p) => p.medida, align: "center", width: "40%" },
    { label: "PRECIO POR UNIDAD", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "40%", className: "precio-final" },
    { label: "% (*)", value: formatearPorcentajeManual, align: "center", width: "20%" },
  ],
};
configuracionListas.Servilletas = {
  className: "lista-comercial--servilletas",
  percentageNote: true,
  sections: [
    {
      id: "productos",
      title: "SERVILLETAS",
      columns: [
        { label: "DETALLE", value: (p) => p.detalle, align: "left", width: "27%" },
        { label: "FORMATO", value: (p) => p.formato, align: "center", width: "15%" },
        { label: "UNIDAD", value: (p) => p.unidad, align: "center", width: "27%" },
        { label: "PRECIO POR UNIDAD", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "20%", className: "precio-final" },
        { label: "% (*)", value: formatearPorcentajeManual, align: "center", width: "11%" },
      ],
    },
    {
      id: "impresion",
      title: "IMPRESIÓN",
      showImpressionDate: true,
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "65%" },
        { label: "PRECIO", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "35%", className: "precio-final" },
      ],
    },
    {
      id: "secamanos",
      title: "SECAMANOS",
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "65%" },
        { label: "PRECIO", value: (p) => formatearMoneda(obtenerPrecioPublicado(p)), align: "right", width: "35%", className: "precio-final" },
      ],
    },
  ].map((seccion) => ({
    ...seccion,
    matches: (producto) => producto.seccion === seccion.id,
  })),
};


function obtenerFechaActualizacion(categoria) {
  return obtenerConfiguracionCategoria(categoria)?.fechaPublicacion || "";
}
function obtenerFechaHoyISO() { return fechaGeneracion; }
function formatearFechaArgentina(fecha) {
  if (typeof fecha !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return "-";
  return fecha.split("-").reverse().join("/");
}
function lista(categoria) {
  const datos = esCategoriaFastFood(categoria) && !esBorrador ? obtenerProductosPublicados(categoria) : obtenerProductosDeCategoria(categoria);
  const clase = esCategoriaFastFood(categoria) ? "lista-fast-food-activa" : esCategoriaBolsaAmericana(categoria) ? "lista-blanca-extra-activa" : "";
  const titulo = esCategoriaBolsaAmericana(categoria) ? obtenerTituloComercialCategoria(categoria) : categoria;
  const etiqueta = tieneBloqueImpresion(categoria) ? "Última actualización productos" : esCategoriaFastFood(categoria) ? "Fecha de publicación" : "Última actualización";
  return `<section id="areaPDF" class="lista-consulta ${clase}">
    <div class="encabezado-documento"><div class="marca-institucional marca-institucional--documento">${crearMarcaInstitucional("Lista de Precios", "documento")}</div>
    <div class="datos-documento"><h2 id="tituloResultadoFinal">${escaparHTML(titulo)}</h2><p id="fechaActualizacionTexto">${etiqueta}: ${formatearFechaArgentina(obtenerFechaActualizacion(categoria))}</p></div></div>
    <div class="franja-institucional" aria-hidden="true"></div><div id="resultadoFinalCategoria">${crearListaConfigurada(categoria, datos)}</div>
    <footer class="pie-documento"><span>Lorenzo Annecchini S.A.</span><span class="numero-pagina">Lista de precios vigente</span></footer></section>`;
}
return { categorias: ordenCatalogo, estaCategoriaPublicada, lista, categoria: crearCategoriaCatalogo,
  catalogo: () => crearPortadaCatalogo(ordenCatalogo) + ordenCatalogo.map(crearCategoriaCatalogo).join("") };
}
module.exports = { crearPlantilla };
