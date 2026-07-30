const productoInput = document.getElementById("producto");
const categoriaInput = document.getElementById("categoria");
const medidaInput = document.getElementById("medida");
const unidadesPorCajaInput = document.getElementById("unidadesPorCaja");
const anchoInput = document.getElementById("ancho");
const largoInput = document.getElementById("largo");
const fuelleInput = document.getElementById("fuelle");
const unidadesPorBultoInput = document.getElementById("unidadesPorBulto");
const seccionCartoneriaInput = document.getElementById("seccionCartoneria");
const anchoCartoneriaInput = document.getElementById("anchoCartoneria");
const largoCartoneriaInput = document.getElementById("largoCartoneria");
const diametroCartoneriaInput = document.getElementById("diametroCartoneria");
const unidadesCartoneriaInput = document.getElementById("unidadesCartoneria");
const aCotizarCartoneriaInput = document.getElementById("aCotizarCartoneria");
const porcentajeMoldeInput = document.getElementById("porcentajeMolde");
const seccionPapelesInput = document.getElementById("seccionPapeles");
const formatoPapelesInput = document.getElementById("formatoPapeles");
const notaPlatosAdmin = document.getElementById("notaPlatosAdmin");
const textoNotaPlatosInput = document.getElementById("textoNotaPlatos");
const guardarNotaPlatosBtn = document.getElementById("guardarNotaPlatos");
const seccionServilletasInput = document.getElementById("seccionServilletas");
const formatoServilletasInput = document.getElementById("formatoServilletas");
const unidadServilletasInput = document.getElementById("unidadServilletas");
const precioActualInput = document.getElementById("precioActual");
const tipoAumentoInput = document.getElementById("tipoAumento");
const valorAumentoInput = document.getElementById("valorAumento");

const modoOscuroBtn = document.getElementById("modoOscuroBtn");
const textoModo = document.getElementById("textoModo");
const modoOscuroListaBtn = document.getElementById("modoOscuroListaBtn");
const textoModoLista = document.getElementById("textoModoLista");
const accesoAdmin = document.getElementById("accesoAdmin");

const agregarProductoBtn = document.getElementById("agregarProducto");
const cancelarEdicionBtn = document.getElementById("cancelarEdicion");
const exportarCSVBtn = document.getElementById("exportarCSV");
const borrarTodoBtn = document.getElementById("borrarTodo");
const descargarPDFBtn = document.getElementById("descargarPDF");
const descargarCatalogoPortadaBtn = document.getElementById("descargarCatalogoPortada");
const vistaPreviaCatalogoAdminBtn = document.getElementById("vistaPreviaCatalogoAdmin");
const moduloCatalogo = document.getElementById("moduloCatalogo");
const catalogoContenido = document.getElementById("catalogoContenido");
const avisoCatalogo = document.getElementById("avisoCatalogo");
const volverCatalogoBtn = document.getElementById("volverCatalogo");
const descargarCatalogoBtn = document.getElementById("descargarCatalogo");

const categoriaMasivaInput = document.getElementById("categoriaMasiva");
const tipoAumentoMasivoInput = document.getElementById("tipoAumentoMasivo");
const seccionAjusteInput = document.getElementById("seccionAjuste");
const valorAumentoMasivoInput = document.getElementById("valorAumentoMasivo");
const aplicarAumentoMasivoBtn = document.getElementById("aplicarAumentoMasivo");

const tablaProductos = document.getElementById("tablaProductos");
const encabezadoTablaProductos = document.getElementById("encabezadoTablaProductos");
const listaPorCategoria = document.getElementById("listaPorCategoria");
const recargosImpresionAdmin = document.getElementById("recargosImpresionAdmin");
const tablaRecargosAdmin = document.getElementById("tablaRecargosAdmin");
const guardarRecargosBtn = document.getElementById("guardarRecargos");

const portada = document.getElementById("portada");
const portadaAdmin = document.getElementById("portadaAdmin");
const gridAdmin = document.getElementById("gridAdmin");
const moduloCategoria = document.getElementById("moduloCategoria");
const moduloResultadoFinal = document.getElementById("moduloResultadoFinal");

const tituloCategoriaActiva = document.getElementById("tituloCategoriaActiva");
const tituloResultadoFinal = document.getElementById("tituloResultadoFinal");
const fechaActualizacionTexto = document.getElementById("fechaActualizacionTexto");
const fechaActualizacionAdmin = document.getElementById("fechaActualizacionAdmin");
const fechaActualizacionLabel = document.getElementById("fechaActualizacionLabel");
const fechasSeccionesPapeles = document.getElementById("fechasSeccionesPapeles");
const fechaRecargosPapeles = document.getElementById("fechaRecargosPapeles");
const fechaImportadosPapeles = document.getElementById("fechaImportadosPapeles");
const fechaSeccionServilletas = document.getElementById("fechaSeccionServilletas");
const fechaImpresionServilletas = document.getElementById("fechaImpresionServilletas");
const resultadoFinalCategoria = document.getElementById("resultadoFinalCategoria");

const volverPortadaBtn = document.getElementById("volverPortada");
const volverPortadaResultadoBtn = document.getElementById("volverPortadaResultado");
const areaPDF = document.getElementById("areaPDF");

const botonesListaFinal = document.querySelectorAll(".boton-lista-final");
const categorias = [...botonesListaFinal].map((boton) => boton.dataset.categoria);
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

let productos = [];
let categoriaActiva = "";
let productoEditandoIndex = null;
let categoriaResultadoFinal = "";
const esModoAdmin =
  window.location.pathname === "/admin" ||
  new URLSearchParams(window.location.search).has("admin");

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

function renderizarMarcasInstitucionales() {
  document.querySelectorAll(".marca-institucional[data-titulo]").forEach((marca) => {
    const esDocumento = marca.classList.contains("marca-institucional--documento");
    marca.innerHTML = crearMarcaInstitucional(
      marca.dataset.titulo,
      esDocumento ? "documento" : ""
    );
  });
}

async function cargarProductosDesdeJSON() {
  try {
    const respuesta = await fetch("/api/productos");
    productos = await respuesta.json();
  } catch (error) {
    console.error("Error al cargar productos:", error);
    productos = [];
  }
}

async function guardarProductos() {
  try {
    await fetch("/api/productos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(productos),
    });
  } catch (error) {
    console.error("Error al guardar productos:", error);
    alert("No se pudieron guardar los productos en el JSON.");
  }
}

function calcularPrecioNuevo(precioActual, tipoAumento, valorAumento) {
  if (tipoAumento === "porcentaje") {
    return precioActual * (1 + valorAumento / 100);
  }

  if (tipoAumento === "importe") {
    return precioActual + valorAumento;
  }

  if (tipoAumento === "descuento-porcentaje") {
    return precioActual * (1 - valorAumento / 100);
  }

  if (tipoAumento === "descuento-importe") {
    return Math.max(0, precioActual - valorAumento);
  }

  return precioActual;
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

function formatearEntero(valor) {
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

function usaConfiguracionCategoria(categoria) {
  return (
    esCategoriaFastFood(categoria) ||
    esCategoriaBolsaAmericana(categoria) ||
    esCategoriaCartoneria(categoria) ||
    esCategoriaMoldes(categoria) ||
    esCategoriaPapeles(categoria) ||
    esCategoriaPlatosDorados(categoria) ||
    esCategoriaServilletas(categoria)
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

function actualizarCamposEspeciales(categoria) {
  const mostrarFastFood = esCategoriaFastFood(categoria);
  const mostrarBolsaAmericana = esCategoriaBolsaAmericana(categoria);

  document.querySelectorAll(".campo-fast-food, .columna-fast-food").forEach((elemento) => {
    elemento.classList.toggle("oculto", !mostrarFastFood);
  });
  document.querySelectorAll(".campo-blanca-extra").forEach((elemento) => {
    elemento.classList.toggle("oculto", !mostrarBolsaAmericana);
  });
  recargosImpresionAdmin.classList.toggle("oculto", !mostrarBolsaAmericana);
  document.querySelectorAll(".campo-cartoneria").forEach((elemento) => {
    elemento.classList.toggle("oculto", !esCategoriaCartoneria(categoria));
  });
  document.querySelectorAll(".campo-porcentaje-comercial").forEach((elemento) => {
    elemento.classList.toggle(
      "oculto",
      !esCategoriaMoldes(categoria) &&
        !esCategoriaPlatosDorados(categoria) &&
        !esCategoriaServilletas(categoria)
    );
  });
  document.querySelectorAll(".campo-papeles").forEach((elemento) => {
    elemento.classList.toggle("oculto", !esCategoriaPapeles(categoria));
  });
  fechasSeccionesPapeles.classList.toggle("oculto", !esCategoriaPapeles(categoria));
  notaPlatosAdmin.classList.toggle("oculto", !esCategoriaPlatosDorados(categoria));
  document.querySelectorAll(".campo-servilletas").forEach((elemento) => {
    elemento.classList.toggle("oculto", !esCategoriaServilletas(categoria));
  });
  fechaSeccionServilletas.classList.toggle("oculto", !esCategoriaServilletas(categoria));
  actualizarCamposSeccionServilletas();
  const usaSecciones =
    esCategoriaCartoneria(categoria) ||
    esCategoriaPapeles(categoria) ||
    esCategoriaServilletas(categoria);
  seccionAjusteInput.classList.toggle("oculto", !usaSecciones);
  if (usaSecciones) {
    const opciones = esCategoriaPapeles(categoria)
      ? [
          ["", "Toda la categoría"],
          ["papeles-principales", "Papeles principales"],
          ["recargos-impresion", "Recargos por impresión"],
          ["productos-importados", "Productos importados"],
        ]
      : esCategoriaServilletas(categoria)
        ? [
            ["", "Toda la categoría"],
            ["productos", "Servilletas"],
            ["impresion", "Impresión"],
            ["secamanos", "Secamanos"],
          ]
      : [
          ["", "Toda la categoría"],
          ["economicas-rectangulares", "Económicas · Rectangulares"],
          ["economicas-redondas", "Económicas · Redondas"],
          ["reforzadas-rectangulares", "Reforzadas · Rectangulares"],
          ["reforzadas-redondas", "Reforzadas · Redondas"],
          ["pesadas-rectangulares", "Pesadas · Rectangulares"],
          ["pesadas-redondas", "Pesadas · Redondas"],
          ["otros-carton", "Otros artículos"],
        ];
    seccionAjusteInput.innerHTML = opciones
      .map(([valor, texto]) => `<option value="${valor}">${texto}</option>`)
      .join("");
  }
  actualizarCamposSeccionCartoneria();
}

function actualizarCamposSeccionServilletas() {
  const mostrar =
    esCategoriaServilletas(categoriaActiva) &&
    seccionServilletasInput.value === "productos";
  document.querySelectorAll(".campo-servilletas-producto").forEach((elemento) => {
    elemento.classList.toggle("oculto", !mostrar);
  });
  if (esCategoriaServilletas(categoriaActiva)) {
    porcentajeMoldeInput.classList.toggle("oculto", !mostrar);
  }
}

function actualizarCamposSeccionCartoneria() {
  const seccion = seccionCartoneriaInput.value;
  const esOtros = seccion === "otros-carton";
  const esRedonda = seccion.endsWith("-redondas");

  document.querySelectorAll(".campo-cartoneria-rectangular").forEach((elemento) => {
    elemento.classList.toggle("oculto", esOtros || esRedonda || !esCategoriaCartoneria(categoriaActiva));
  });
  document.querySelectorAll(".campo-cartoneria-redonda").forEach((elemento) => {
    elemento.classList.toggle("oculto", esOtros || !esRedonda || !esCategoriaCartoneria(categoriaActiva));
  });
  document.querySelectorAll(".campo-cartoneria-bandeja").forEach((elemento) => {
    elemento.classList.toggle("oculto", esOtros || !esCategoriaCartoneria(categoriaActiva));
  });
  document.querySelectorAll(".campo-cartoneria-otros").forEach((elemento) => {
    elemento.classList.toggle("oculto", !esOtros || !esCategoriaCartoneria(categoriaActiva));
  });
}

function obtenerFechaHoyISO() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

function formatearFechaArgentina(fechaISO) {
  if (!fechaISO) {
    return "-";
  }

  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

function obtenerClaveFechaCategoria(categoria) {
  return `fechaActualizacionLASA_${categoria}`;
}

function cargarFechaActualizacion(categoria) {
  const fechaGuardada = obtenerFechaActualizacion(categoria);

  fechaActualizacionTexto.textContent = fechaGuardada
    ? `${esCategoriaFastFood(categoria) || esCategoriaBolsaAmericana(categoria) ? "Fecha de publicación" : "Última actualización"}: ${formatearFechaArgentina(fechaGuardada)}`
    : "Sin fecha publicada";
}

function obtenerFechaActualizacion(categoria) {
  if (usaConfiguracionCategoria(categoria)) {
    return obtenerConfiguracionCategoria(categoria)?.fechaPublicacion || "";
  }
  return localStorage.getItem(obtenerClaveFechaCategoria(categoria)) || "";
}

function renderizarPanelAdmin() {
  gridAdmin.innerHTML = categorias
    .map((categoria) => {
      const fechaGuardada = obtenerFechaActualizacion(categoria);
      const fecha = fechaGuardada
        ? formatearFechaArgentina(fechaGuardada)
        : "Sin fecha registrada";

      return `
        <article class="tarjeta-admin" data-categoria="${categoria}">
          <div class="tarjeta-admin-encabezado">
            <h3>${categoria}</h3>
            <p>Última actualización: ${fecha}</p>
          </div>
          <div class="acciones-admin">
            <button type="button" data-accion="editar">Editar lista</button>
            <button type="button" data-accion="ajustar">Aplicar ajuste</button>
            <button type="button" data-accion="vista-previa" class="boton-secundario">Vista previa</button>
            ${
              usaConfiguracionCategoria(categoria)
                ? (() => {
                    const errores = validarCategoriaParaPublicar(categoria);
                    return errores.length === 0
                      ? '<button type="button" data-accion="publicar" class="boton-publicar">Publicar lista</button>'
                      : `<button type="button" class="boton-publicar" disabled title="${escaparHTML(errores[0])}">Publicar lista</button><p class="error-publicacion">${escaparHTML(errores[0])}</p>`;
                  })()
                : '<button type="button" class="boton-publicar" disabled title="Publicación no configurada para esta categoría">Publicar lista</button>'
            }
          </div>
        </article>
      `;
    })
    .join("");
}

function validarCategoriaParaPublicar(categoria) {
  if (!esCategoriaFastFood(categoria)) return [];

  const productosCategoria = obtenerProductosDeCategoria(categoria);
  if (productosCategoria.length === 0) {
    return ["No se puede publicar: la categoría no tiene productos."];
  }

  for (const producto of productosCategoria) {
    if (!producto.nombre?.trim()) {
      return ["No se puede publicar: hay un producto sin artículo."];
    }
    if (!producto.medida?.trim()) {
      return [`No se puede publicar: falta completar Medida en ${producto.nombre}.`];
    }
    if (!Number.isInteger(producto.unidadesPorCaja) || producto.unidadesPorCaja <= 0) {
      return [`No se puede publicar: falta completar Unidades por caja en ${producto.nombre}.`];
    }
    if (!Number.isFinite(Number(producto.precioNuevo)) || Number(producto.precioNuevo) <= 0) {
      return [`No se puede publicar: el precio de ${producto.nombre} no es válido.`];
    }
  }

  return [];
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

function obtenerProductosDeCategoriaActiva() {
  if (!categoriaActiva) {
    return productos;
  }

  return obtenerProductosDeCategoria(categoriaActiva);
}

function limpiarFormulario() {
  productoInput.value = "";
  medidaInput.value = "";
  unidadesPorCajaInput.value = "";
  anchoInput.value = "";
  largoInput.value = "";
  fuelleInput.value = "";
  unidadesPorBultoInput.value = "";
  seccionCartoneriaInput.value = "economicas-rectangulares";
  anchoCartoneriaInput.value = "";
  largoCartoneriaInput.value = "";
  diametroCartoneriaInput.value = "";
  unidadesCartoneriaInput.value = "";
  aCotizarCartoneriaInput.checked = false;
  porcentajeMoldeInput.value = "";
  seccionPapelesInput.value = "papeles-principales";
  formatoPapelesInput.value = "";
  seccionServilletasInput.value = "productos";
  formatoServilletasInput.value = "";
  unidadServilletasInput.value = "";
  seccionServilletasInput.value = "productos";
  formatoServilletasInput.value = "";
  unidadServilletasInput.value = "";
  precioActualInput.value = "";
  tipoAumentoInput.value = "sin";
  valorAumentoInput.value = "";

  productoEditandoIndex = null;
  agregarProductoBtn.textContent = "Agregar producto";
  cancelarEdicionBtn.classList.add("oculto");

  if (categoriaActiva) {
    categoriaInput.value = categoriaActiva;
  }
  actualizarCamposSeccionCartoneria();
  actualizarCamposSeccionServilletas();
}

function limpiarFormularioMasivo() {
  tipoAumentoMasivoInput.value = "porcentaje";
  valorAumentoMasivoInput.value = "";

  if (categoriaActiva) {
    categoriaMasivaInput.value = categoriaActiva;
  }
}

function renderizarTabla() {
  tablaProductos.innerHTML = "";
  const esBolsaAmericana = esCategoriaBolsaAmericana(categoriaActiva);
  const esCartoneria = esCategoriaCartoneria(categoriaActiva);
  const esMoldes = esCategoriaMoldes(categoriaActiva);
  const esPapeles = esCategoriaPapeles(categoriaActiva);
  const esPlatosDorados = esCategoriaPlatosDorados(categoriaActiva);
  const esServilletas = esCategoriaServilletas(categoriaActiva);

  encabezadoTablaProductos.innerHTML = esServilletas
    ? `<th>Detalle</th><th>Sección</th><th>Formato</th><th>Unidad</th><th>Precio</th><th>Porcentaje</th><th>Acciones</th>`
    : esPlatosDorados
    ? `<th>Medida</th><th>Precio por unidad</th><th>Porcentaje</th><th>Acciones</th>`
    : esPapeles
    ? `<th>Descripción / tipo</th><th>Sección</th><th>Formato / detalle</th><th>Precio</th><th>Acciones</th>`
    : esMoldes
    ? `<th>Descripción</th><th>Precio por millar</th><th>Porcentaje</th><th>Acciones</th>`
    : esCartoneria
    ? `
      <th>Número / descripción</th><th>Sección</th><th>Ancho</th>
      <th>Largo / diámetro</th><th>Unidades</th><th>Precio</th>
      <th>Porcentaje</th><th>Acciones</th>
    `
    : esBolsaAmericana
    ? `
      <th>Número</th><th>Ancho</th><th>Largo</th><th>Fuelle</th>
      <th>Unidades por bulto</th><th>Precio por millar</th>
      <th>Porcentaje</th><th>Acciones</th>
    `
    : `
      <th>Producto</th>
      <th class="columna-fast-food ${esCategoriaFastFood(categoriaActiva) ? "" : "oculto"}">Medida</th>
      <th class="columna-fast-food ${esCategoriaFastFood(categoriaActiva) ? "" : "oculto"}">Unidades por caja</th>
      <th>Categoría</th><th>Precio actual</th><th>Tipo aumento</th>
      <th>Valor</th><th>Precio nuevo</th><th>Acciones</th>
    `;

  const productosFiltrados = obtenerProductosDeCategoriaActiva();

  if (productosFiltrados.length === 0) {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="${esServilletas ? 7 : esPlatosDorados ? 4 : esPapeles ? 5 : esMoldes ? 4 : esBolsaAmericana || esCartoneria ? 8 : esCategoriaFastFood(categoriaActiva) ? 9 : 7}">
          No hay productos cargados en esta categoría.
        </td>
      </tr>
    `;
    return;
  }

  productosFiltrados.forEach((producto) => {
    const indexReal = productos.indexOf(producto);
    const fila = document.createElement("tr");

    fila.innerHTML = esServilletas ? `
      <td>${escaparHTML(producto.detalle || producto.descripcion || producto.nombre)}</td>
      <td>${escaparHTML(producto.seccion || "—")}</td>
      <td class="alinear-center">${escaparHTML(producto.formato || "—")}</td>
      <td class="alinear-center">${escaparHTML(producto.unidad || "—")}</td>
      <td class="alinear-right"><strong>${formatearMoneda(producto.precioNuevo)}</strong></td>
      <td class="alinear-center">${producto.seccion === "productos" ? formatearPorcentajeComercial(producto) : "—"}</td>
      <td>
        <button class="boton-secundario" onclick="moverProductoEnSeccion(${indexReal}, -1)">↑</button>
        <button class="boton-secundario" onclick="moverProductoEnSeccion(${indexReal}, 1)">↓</button>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    ` : esPlatosDorados ? `
      <td class="alinear-center">${escaparHTML(producto.medida || producto.nombre)}</td>
      <td class="alinear-right"><strong>${formatearMoneda(producto.precioNuevo)}</strong></td>
      <td class="alinear-center">${formatearPorcentajeComercial(producto)}</td>
      <td>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    ` : esPapeles ? `
      <td>${escaparHTML(producto.descripcion || producto.nombre)}</td>
      <td>${escaparHTML(producto.seccion || "—")}</td>
      <td>${escaparHTML(producto.formato || "—")}</td>
      <td class="alinear-right"><strong>${formatearMoneda(producto.precioNuevo)}</strong></td>
      <td>
        <button class="boton-secundario" onclick="moverProductoEnSeccion(${indexReal}, -1)">↑</button>
        <button class="boton-secundario" onclick="moverProductoEnSeccion(${indexReal}, 1)">↓</button>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    ` : esMoldes ? `
      <td>${escaparHTML(producto.descripcion || producto.nombre)}</td>
      <td class="alinear-right"><strong>${formatearMoneda(producto.precioNuevo)}</strong></td>
      <td class="alinear-center">${formatearPorcentajeComercial(producto)}</td>
      <td>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    ` : esCartoneria ? `
      <td>${escaparHTML(producto.numero || producto.descripcion || producto.nombre)}</td>
      <td>${escaparHTML(producto.seccion || "—")}</td>
      <td class="alinear-center">${escaparHTML(producto.ancho || "—")}</td>
      <td class="alinear-center">${escaparHTML(producto.largo || producto.diametro || "—")}</td>
      <td class="alinear-center">${formatearEntero(producto.unidadesPorBulto)}</td>
      <td class="alinear-right"><strong>${producto.aCotizar ? "A cotizar" : formatearMoneda(producto.precioNuevo)}</strong></td>
      <td class="alinear-center">${formatearPorcentaje(producto)}</td>
      <td>
        <button class="boton-secundario" onclick="moverProductoEnSeccion(${indexReal}, -1)" title="Mover hacia arriba">↑</button>
        <button class="boton-secundario" onclick="moverProductoEnSeccion(${indexReal}, 1)" title="Mover hacia abajo">↓</button>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    ` : esBolsaAmericana ? `
      <td class="alinear-center">${escaparHTML(producto.codigo || producto.nombre)}</td>
      <td class="alinear-center">${escaparHTML(producto.ancho || "—")}</td>
      <td class="alinear-center">${escaparHTML(producto.largo || "—")}</td>
      <td class="alinear-center">${escaparHTML(producto.fuelle || "—")}</td>
      <td class="alinear-center">${formatearEntero(producto.unidadesPorBulto)}</td>
      <td class="alinear-right"><strong>${formatearMoneda(producto.precioNuevo)}</strong></td>
      <td class="alinear-center">${formatearPorcentaje(producto)}</td>
      <td>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    ` : `
      <td>${producto.nombre}</td>
      <td class="columna-fast-food ${esCategoriaFastFood(categoriaActiva) ? "" : "oculto"}">${escaparHTML(producto.medida || "—")}</td>
      <td class="columna-fast-food ${esCategoriaFastFood(categoriaActiva) ? "" : "oculto"}">${formatearEntero(producto.unidadesPorCaja)}</td>
      <td>${producto.categoria}</td>
      <td>${formatearMoneda(producto.precioActual)}</td>
      <td>${producto.tipoAumento}</td>
      <td>${producto.valorAumento}</td>
      <td><strong>${formatearMoneda(producto.precioNuevo)}</strong></td>
      <td>
        <button class="boton-editar" onclick="editarProducto(${indexReal})">Editar</button>
        <button class="boton-eliminar" onclick="eliminarProducto(${indexReal})">Eliminar</button>
      </td>
    `;

    tablaProductos.appendChild(fila);
  });
}

function crearTablaFinalCategoria(categoria, productosCategoria, mostrarCategoria = true) {
  let contenido = `
    <div class="bloque-categoria">
      ${mostrarCategoria ? `<h3>${categoria}</h3>` : ""}
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
        <td>${producto.nombre}</td>
        <td class="precio-final">${formatearMoneda(producto.precioNuevo)}</td>
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
        value: (producto) => formatearMoneda(producto.precioNuevo),
        align: "right",
        width: "25%",
        className: "precio-final",
      },
    ],
  },
  "Bolsas Blanca Extra": {
    className: "lista-comercial--blanca-extra",
    columns: [
      { label: "NÚMERO", value: (p) => p.codigo || p.nombre, align: "center", width: "14%" },
      { label: "ANCHO\ncm", value: (p) => p.ancho, align: "center", width: "11%" },
      { label: "LARGO\ncm", value: (p) => p.largo, align: "center", width: "11%" },
      { label: "FUELLE\ncm", value: (p) => p.fuelle, align: "center", width: "11%" },
      { label: "UNIDADES POR BULTO", value: (p) => formatearEntero(p.unidadesPorBulto), align: "center", width: "20%" },
      { label: "$ POR MILLAR\n1.000", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "22%", className: "precio-final" },
      { label: "% (*)", value: formatearPorcentaje, align: "center", width: "11%" },
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
        value: (producto) => formatearMoneda(producto.precioNuevo),
        align: "right",
        width: "27%",
        className: "precio-final",
      },
      {
        label: "% (*)",
        value: formatearPorcentajeComercial,
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
        value: (producto) => formatearMoneda(producto.precioNuevo),
        align: "right",
        width: "27%",
        className: "precio-final",
      },
      {
        label: "Porcentaje",
        value: formatearPorcentaje,
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
  { label: "NÚMERO", value: (p) => p.numero, align: "center", width: "12%" },
  { label: "ANCHO\ncm", value: (p) => p.ancho, align: "center", width: "14%" },
  { label: "LARGO\ncm", value: (p) => p.largo, align: "center", width: "14%" },
  { label: "$ POR MILLAR\n1.000", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "25%", className: "precio-final" },
  { label: "UNIDADES POR BULTO", value: (p) => formatearEntero(p.unidadesPorBulto), align: "center", width: "22%" },
  { label: "% (*)", value: formatearPorcentaje, align: "center", width: "13%" },
];
const columnasCartoneriaRedonda = [
  { label: "NÚMERO", value: (p) => p.numero, align: "center", width: "15%" },
  { label: "DIÁMETRO\ncm", value: (p) => p.diametro, align: "center", width: "20%" },
  { label: "$ POR MILLAR\n1.000", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "25%", className: "precio-final" },
  { label: "UNIDADES POR BULTO", value: (p) => formatearEntero(p.unidadesPorBulto), align: "center", width: "25%" },
  { label: "% (*)", value: formatearPorcentaje, align: "center", width: "15%" },
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
        { label: "PRECIO", value: (p) => p.aCotizar ? "A cotizar" : formatearMoneda(p.precioNuevo), align: "right", width: "25%", className: "precio-final" },
        { label: "% (*)", value: formatearPorcentaje, align: "center", width: "15%" },
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
        { label: "PRECIO", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "22%", className: "precio-final" },
      ],
    },
    {
      id: "recargos-impresion",
      title: "RECARGOS POR IMPRESIÓN",
      showDate: true,
      columns: [
        { label: "TIPO DE IMPRESIÓN", value: (p) => p.descripcion, align: "left", width: "65%" },
        { label: "PRECIO", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "35%", className: "precio-final" },
      ],
    },
    {
      id: "productos-importados",
      title: "PRODUCTOS IMPORTADOS",
      showDate: true,
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "42%" },
        { label: "FORMATO / DETALLE", value: (p) => p.formato || "—", align: "center", width: "36%" },
        { label: "PRECIO", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "22%", className: "precio-final" },
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
    { label: "PRECIO POR UNIDAD", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "40%", className: "precio-final" },
    { label: "% (*)", value: formatearPorcentajeComercial, align: "center", width: "20%" },
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
        { label: "PRECIO POR UNIDAD", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "20%", className: "precio-final" },
        { label: "% (*)", value: formatearPorcentajeComercial, align: "center", width: "11%" },
      ],
    },
    {
      id: "impresion",
      title: "IMPRESIÓN",
      showDate: true,
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "65%" },
        { label: "PRECIO", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "35%", className: "precio-final" },
      ],
    },
    {
      id: "secamanos",
      title: "SECAMANOS",
      columns: [
        { label: "DESCRIPCIÓN", value: (p) => p.descripcion, align: "left", width: "65%" },
        { label: "PRECIO", value: (p) => formatearMoneda(p.precioNuevo), align: "right", width: "35%", className: "precio-final" },
      ],
    },
  ].map((seccion) => ({
    ...seccion,
    matches: (producto) => producto.seccion === seccion.id,
  })),
};

function formatearPorcentaje(producto) {
  if (producto.tipoAumento !== "porcentaje") {
    return "—";
  }

  return `${Number(producto.valorAumento).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })} %`;
}

function formatearPorcentajeComercial(producto) {
  const porcentaje = Number(producto.porcentaje);

  if (!Number.isFinite(porcentaje)) {
    return formatearPorcentaje(producto);
  }

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

function crearTablaConfigurada(columnas, productosSeccion) {
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
        <thead><tr>${encabezados}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;
}

function crearSeccionRecargos(recargos) {
  if (recargos.length === 0) {
    return "";
  }

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

function renderizarRecargosAdmin() {
  if (!esCategoriaBolsaAmericana(categoriaActiva)) {
    tablaRecargosAdmin.innerHTML = "";
    return;
  }

  const recargos =
    obtenerConfiguracionCategoria(categoriaActiva)?.recargosImpresion || [];

  tablaRecargosAdmin.innerHTML = recargos
    .map(
      (recargo, index) => `
        <tr data-recargo-index="${index}">
          <td><input class="recargo-descripcion" type="text" value="${escaparHTML(recargo.descripcion)}"></td>
          <td><input class="recargo-una-cara" type="number" min="0" step="0.01" value="${Number(recargo.precioUnaCara)}"></td>
          <td><input class="recargo-dos-caras" type="number" min="0" step="0.01" value="${Number(recargo.precioDosCaras)}"></td>
        </tr>
      `
    )
    .join("");
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

      const encabezadoSeccion = `
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
        productosSeccion
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
    contenido += crearSeccionRecargos(recargos);
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

function obtenerCategoriasSinPublicar() {
  return ordenCatalogo.filter((categoria) => !estaCategoriaPublicada(categoria));
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
    <article class="catalogo-categoria">
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

function abrirCatalogo(esVistaAdmin) {
  const faltantes = obtenerCategoriasSinPublicar();

  if (!esVistaAdmin && faltantes.length > 0) {
    alert(
      `No se puede generar el catálogo completo porque faltan listas publicadas: ${faltantes.join(", ")}.`
    );
    return;
  }

  const categoriasPublicadas = ordenCatalogo.filter(
    (categoria) => !faltantes.includes(categoria)
  );
  catalogoContenido.innerHTML =
    crearPortadaCatalogo(categoriasPublicadas) +
    categoriasPublicadas.map(crearCategoriaCatalogo).join("");

  avisoCatalogo.classList.toggle("oculto", faltantes.length === 0);
  avisoCatalogo.textContent =
    faltantes.length > 0
      ? `Faltan publicar: ${faltantes.join(", ")}. La descarga permanecerá bloqueada.`
      : "";
  descargarCatalogoBtn.disabled = faltantes.length > 0;

  portada.classList.add("oculto");
  portadaAdmin.classList.add("oculto");
  moduloCategoria.classList.add("oculto");
  moduloResultadoFinal.classList.add("oculto");
  moduloCatalogo.classList.remove("oculto");
  document.body.classList.add("vista-catalogo");
}

function renderizarListaPorCategoria() {
  listaPorCategoria.innerHTML = "";

  const productosFiltrados = obtenerProductosDeCategoriaActiva();

  if (productosFiltrados.length === 0) {
    listaPorCategoria.innerHTML = "<p>No hay productos cargados en esta categoría.</p>";
    return;
  }

  listaPorCategoria.innerHTML =
    configuracionListas[categoriaActiva]
    ? crearListaConfigurada(categoriaActiva, productosFiltrados, true)
    : crearTablaFinalCategoria(categoriaActiva, productosFiltrados);
}

function renderizarResultadoFinalCategoria(categoria) {
  const productosCategoria =
    esCategoriaFastFood(categoria) && !esModoAdmin
      ? obtenerProductosPublicados(categoria)
      : obtenerProductosDeCategoria(categoria);

  categoriaResultadoFinal = categoria;

  tituloResultadoFinal.textContent = categoria;
  resultadoFinalCategoria.innerHTML = "";
  areaPDF.classList.toggle("lista-fast-food-activa", esCategoriaFastFood(categoria));
  areaPDF.classList.toggle("lista-blanca-extra-activa", esCategoriaBolsaAmericana(categoria));
  const nombreListaAmericana =
    categoria === "Bolsas Kraft"
      ? "KRAFT II"
      : categoria.replace("Bolsas ", "").toLocaleUpperCase("es");
  tituloResultadoFinal.textContent = esCategoriaBolsaAmericana(categoria)
    ? `BOLSAS AMERICANAS · ${nombreListaAmericana}`
    : categoria;

  cargarFechaActualizacion(categoria);

  if (productosCategoria.length === 0) {
    resultadoFinalCategoria.innerHTML = "<p>No hay productos cargados en esta categoría.</p>";
    return;
  }

  resultadoFinalCategoria.innerHTML = crearListaConfigurada(
    categoria,
    productosCategoria
  );
}

function editarProducto(index) {
  const producto = productos[index];

  productoEditandoIndex = index;

  productoInput.value =
    producto.medida || producto.detalle || producto.descripcion || producto.nombre;
  categoriaInput.value = producto.categoria;
  medidaInput.value = producto.medida || "";
  unidadesPorCajaInput.value = producto.unidadesPorCaja || "";
  anchoInput.value = producto.ancho || "";
  largoInput.value = producto.largo || "";
  fuelleInput.value = producto.fuelle || "";
  unidadesPorBultoInput.value = producto.unidadesPorBulto || "";
  seccionCartoneriaInput.value = producto.seccion || "economicas-rectangulares";
  anchoCartoneriaInput.value = producto.ancho || "";
  largoCartoneriaInput.value = producto.largo || "";
  diametroCartoneriaInput.value = producto.diametro || "";
  unidadesCartoneriaInput.value = producto.unidadesPorBulto || "";
  aCotizarCartoneriaInput.checked = Boolean(producto.aCotizar);
  porcentajeMoldeInput.value = producto.porcentaje ?? "";
  seccionPapelesInput.value = producto.seccion || "papeles-principales";
  formatoPapelesInput.value = producto.formato || "";
  seccionServilletasInput.value = producto.seccion || "productos";
  formatoServilletasInput.value = producto.formato || "";
  unidadServilletasInput.value = producto.unidad || "";
  precioActualInput.value = producto.precioActual;
  tipoAumentoInput.value = producto.tipoAumento;
  valorAumentoInput.value = producto.valorAumento;

  agregarProductoBtn.textContent = "Guardar cambios";
  cancelarEdicionBtn.classList.remove("oculto");
  actualizarCamposSeccionCartoneria();
  actualizarCamposSeccionServilletas();

  productoInput.focus();
}

async function eliminarProducto(index) {
  const confirmar = confirm("¿Seguro que querés eliminar este producto?");

  if (confirmar) {
    productos.splice(index, 1);

    await guardarProductos();
    renderizarTabla();
    renderizarListaPorCategoria();
    limpiarFormulario();
  }
}

async function moverProductoEnSeccion(index, direccion) {
  const producto = productos[index];
  const indicesSeccion = productos
    .map((registro, posicion) => ({ registro, posicion }))
    .filter(
      ({ registro }) =>
        registro.categoria === producto.categoria &&
        registro.seccion === producto.seccion &&
        !esRegistroConfiguracion(registro)
    )
    .map(({ posicion }) => posicion);
  const posicionActual = indicesSeccion.indexOf(index);
  const posicionDestino = posicionActual + direccion;

  if (posicionDestino < 0 || posicionDestino >= indicesSeccion.length) {
    return;
  }

  const indexDestino = indicesSeccion[posicionDestino];
  [productos[index], productos[indexDestino]] = [
    productos[indexDestino],
    productos[index],
  ];
  await guardarProductos();
  renderizarTabla();
  renderizarListaPorCategoria();
}

function abrirModuloCategoria(categoria) {
  categoriaActiva = categoria;

  portada.classList.add("oculto");
  portadaAdmin.classList.add("oculto");
  moduloResultadoFinal.classList.add("oculto");
  moduloCategoria.classList.remove("oculto");

  tituloCategoriaActiva.textContent = categoria;

  categoriaInput.value = categoria;
  categoriaMasivaInput.value = categoria;
  fechaActualizacionAdmin.value = obtenerFechaActualizacion(categoria);
  const configuracionCategoria = obtenerConfiguracionCategoria(categoria);
  fechaRecargosPapeles.value =
    configuracionCategoria?.fechasSecciones?.["recargos-impresion"] || "";
  fechaImportadosPapeles.value =
    configuracionCategoria?.fechasSecciones?.["productos-importados"] || "";
  textoNotaPlatosInput.value = configuracionCategoria?.notaComercial || "";
  fechaImpresionServilletas.value =
    configuracionCategoria?.fechasSecciones?.impresion || "";
  fechaActualizacionLabel.textContent = esCategoriaFastFood(categoria) || usaConfiguracionCategoria(categoria)
    ? "Fecha de publicación"
    : "Fecha de actualización";
  actualizarCamposEspeciales(categoria);
  renderizarRecargosAdmin();

  limpiarFormulario();
  limpiarFormularioMasivo();

  renderizarTabla();
  renderizarListaPorCategoria();
}

function abrirResultadoFinal(categoria) {
  categoriaActiva = "";

  portada.classList.add("oculto");
  portadaAdmin.classList.add("oculto");
  moduloCategoria.classList.add("oculto");
  moduloResultadoFinal.classList.remove("oculto");
  document.body.classList.add("vista-lista");

  renderizarResultadoFinalCategoria(categoria);
}

function volverALaPortada() {
  categoriaActiva = "";
  categoriaResultadoFinal = "";

  moduloCategoria.classList.add("oculto");
  moduloResultadoFinal.classList.add("oculto");
  moduloCatalogo.classList.add("oculto");
  document.body.classList.remove("vista-lista");
  document.body.classList.remove("vista-catalogo");
  areaPDF.classList.remove("lista-fast-food-activa");
  actualizarCamposEspeciales("");
  areaPDF.classList.remove("lista-blanca-extra-activa");

  if (esModoAdmin) {
    portada.classList.add("oculto");
    portadaAdmin.classList.remove("oculto");
  } else {
    portadaAdmin.classList.add("oculto");
    portada.classList.remove("oculto");
  }

  limpiarFormulario();
  limpiarFormularioMasivo();
}

gridAdmin.addEventListener("click", (evento) => {
  const boton = evento.target.closest("button[data-accion]");

  if (!boton) {
    return;
  }

  const tarjeta = boton.closest(".tarjeta-admin");
  const categoria = tarjeta.dataset.categoria;
  const accion = boton.dataset.accion;

  if (accion === "publicar") {
    const errores = validarCategoriaParaPublicar(categoria);
    if (errores.length > 0) {
      alert(errores.join("\n"));
      return;
    }

    const fechaPublicacion =
      obtenerFechaActualizacion(categoria) || obtenerFechaHoyISO();

    if (usaConfiguracionCategoria(categoria)) {
      const configuracion = obtenerConfiguracionCategoria(categoria);
      if (configuracion) {
        configuracion.fechaPublicacion = fechaPublicacion;
        if (esCategoriaFastFood(categoria)) {
          configuracion.publishedAt = new Date().toISOString();
          configuracion.productosPublicados = obtenerProductosDeCategoria(categoria)
            .map((producto) => ({ ...producto }));
        }
        guardarProductos().then(() => {
          renderizarPanelAdmin();
          alert(`Lista publicada con fecha ${formatearFechaArgentina(fechaPublicacion)}.`);
        });
      }
    } else {
      localStorage.setItem(obtenerClaveFechaCategoria(categoria), fechaPublicacion);
      renderizarPanelAdmin();
      alert(`Lista publicada con fecha ${formatearFechaArgentina(fechaPublicacion)}.`);
    }
    return;
  }

  if (accion === "vista-previa") {
    abrirResultadoFinal(categoria);
    return;
  }

  abrirModuloCategoria(categoria);

  if (accion === "ajustar") {
    document.getElementById("ajustesCategoria").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
});

botonesListaFinal.forEach((boton) => {
  boton.addEventListener("click", () => {
    const categoria = boton.dataset.categoria;
    abrirResultadoFinal(categoria);
  });
});

volverPortadaBtn.addEventListener("click", () => {
  volverALaPortada();
});

volverPortadaResultadoBtn.addEventListener("click", () => {
  volverALaPortada();
});

descargarCatalogoPortadaBtn.addEventListener("click", () => {
  abrirCatalogo(false);
});

vistaPreviaCatalogoAdminBtn.addEventListener("click", () => {
  abrirCatalogo(true);
});

volverCatalogoBtn.addEventListener("click", () => {
  volverALaPortada();
});

descargarCatalogoBtn.addEventListener("click", () => {
  const faltantes = obtenerCategoriasSinPublicar();
  if (faltantes.length > 0) {
    alert(`No se puede descargar: faltan publicar ${faltantes.join(", ")}.`);
    return;
  }

  const tituloAnterior = document.title;
  document.title = `Listas-de-Precios-LASA-${obtenerFechaHoyISO()}`;
  window.addEventListener(
    "afterprint",
    () => {
      document.title = tituloAnterior;
    },
    { once: true }
  );
  window.print();
});

fechaActualizacionAdmin.addEventListener("change", async () => {
  if (!categoriaActiva || !fechaActualizacionAdmin.value) {
    return;
  }

  if (usaConfiguracionCategoria(categoriaActiva)) {
    const configuracion = obtenerConfiguracionCategoria(categoriaActiva);
    if (configuracion) {
      configuracion.fechaPublicacion = fechaActualizacionAdmin.value;
      await guardarProductos();
    }
  } else {
    localStorage.setItem(
      obtenerClaveFechaCategoria(categoriaActiva),
      fechaActualizacionAdmin.value
    );
  }
  renderizarPanelAdmin();
});

seccionCartoneriaInput.addEventListener("change", actualizarCamposSeccionCartoneria);
seccionServilletasInput.addEventListener("change", actualizarCamposSeccionServilletas);

async function guardarFechaSeccionPapeles(seccion, fecha) {
  const configuracion = obtenerConfiguracionCategoria("Papeles");
  if (!configuracion || !fecha) return;
  configuracion.fechasSecciones ||= {};
  configuracion.fechasSecciones[seccion] = fecha;
  await guardarProductos();
  renderizarListaPorCategoria();
}

fechaRecargosPapeles.addEventListener("change", () =>
  guardarFechaSeccionPapeles("recargos-impresion", fechaRecargosPapeles.value)
);
fechaImportadosPapeles.addEventListener("change", () =>
  guardarFechaSeccionPapeles("productos-importados", fechaImportadosPapeles.value)
);
fechaImpresionServilletas.addEventListener("change", async () => {
  const configuracion = obtenerConfiguracionCategoria("Servilletas");
  if (!configuracion || !fechaImpresionServilletas.value) return;
  configuracion.fechasSecciones ||= {};
  configuracion.fechasSecciones.impresion = fechaImpresionServilletas.value;
  await guardarProductos();
  renderizarListaPorCategoria();
});

agregarProductoBtn.addEventListener("click", async () => {
  const nombre = productoInput.value.trim();
  const categoria = categoriaActiva;
  const medida = medidaInput.value.trim();
  const unidadesPorCaja = Number(unidadesPorCajaInput.value);
  const ancho = anchoInput.value.trim();
  const largo = largoInput.value.trim();
  const fuelle = fuelleInput.value.trim();
  const unidadesPorBulto = Number(unidadesPorBultoInput.value);
  const seccionCartoneria = seccionCartoneriaInput.value;
  const anchoCartoneria = anchoCartoneriaInput.value.trim();
  const largoCartoneria = largoCartoneriaInput.value.trim();
  const diametroCartoneria = diametroCartoneriaInput.value.trim();
  const unidadesCartoneria = Number(unidadesCartoneriaInput.value);
  const aCotizarCartoneria = aCotizarCartoneriaInput.checked;
  const porcentajeMolde = Number(porcentajeMoldeInput.value);
  const seccionPapeles = seccionPapelesInput.value;
  const formatoPapeles = formatoPapelesInput.value.trim();
  const seccionServilletas = seccionServilletasInput.value;
  const formatoServilletas = formatoServilletasInput.value.trim();
  const unidadServilletas = unidadServilletasInput.value.trim();
  const precioActual = Number(precioActualInput.value);
  const tipoAumento = tipoAumentoInput.value;
  const valorAumento = Number(valorAumentoInput.value) || 0;

  if (!categoriaActiva) {
    alert("Primero seleccioná una categoría.");
    return;
  }

  if (!nombre || (precioActual <= 0 && !(esCategoriaCartoneria(categoria) && aCotizarCartoneria))) {
    alert("Completá producto y precio actual.");
    return;
  }

  if (esCategoriaFastFood(categoria) && (!medida || !Number.isInteger(unidadesPorCaja) || unidadesPorCaja <= 0)) {
    alert("Completá medida y unidades por caja con valores válidos.");
    return;
  }

  if (
    esCategoriaBolsaAmericana(categoria) &&
    (!ancho || !largo || !fuelle || !Number.isInteger(unidadesPorBulto) || unidadesPorBulto <= 0)
  ) {
    alert("Completá ancho, largo, fuelle y unidades por bulto con valores válidos.");
    return;
  }

  if (esCategoriaCartoneria(categoria) && seccionCartoneria !== "otros-carton") {
    const esRedonda = seccionCartoneria.endsWith("-redondas");
    if (
      (esRedonda && !diametroCartoneria) ||
      (!esRedonda && (!anchoCartoneria || !largoCartoneria)) ||
      !Number.isInteger(unidadesCartoneria) ||
      unidadesCartoneria <= 0
    ) {
      alert("Completá las medidas y unidades correspondientes a la sección.");
      return;
    }
  }

  if (
    (
      esCategoriaMoldes(categoria) ||
      esCategoriaPlatosDorados(categoria) ||
      (esCategoriaServilletas(categoria) && seccionServilletas === "productos")
    ) &&
    (!Number.isFinite(porcentajeMolde) || porcentajeMolde < 0)
  ) {
    alert("Ingresá un porcentaje comercial válido.");
    return;
  }

  const precioNuevo = calcularPrecioNuevo(
    precioActual,
    tipoAumento,
    valorAumento
  );

  const producto = {
    nombre,
    categoria,
    ...(esCategoriaFastFood(categoria) ? { medida, unidadesPorCaja } : {}),
    ...(esCategoriaBolsaAmericana(categoria)
      ? { codigo: nombre, ancho, largo, fuelle, unidadesPorBulto }
      : {}),
    ...(esCategoriaCartoneria(categoria)
      ? {
          seccion: seccionCartoneria,
          ...(seccionCartoneria === "otros-carton"
            ? { descripcion: nombre, aCotizar: aCotizarCartoneria }
            : seccionCartoneria.endsWith("-redondas")
              ? { numero: nombre, diametro: diametroCartoneria, unidadesPorBulto: unidadesCartoneria }
              : { numero: nombre, ancho: anchoCartoneria, largo: largoCartoneria, unidadesPorBulto: unidadesCartoneria }),
        }
      : {}),
    ...(esCategoriaMoldes(categoria)
      ? { descripcion: nombre, porcentaje: porcentajeMolde }
      : {}),
    ...(esCategoriaPapeles(categoria)
      ? { descripcion: nombre, seccion: seccionPapeles, formato: formatoPapeles }
      : {}),
    ...(esCategoriaPlatosDorados(categoria)
      ? { medida: nombre, porcentaje: porcentajeMolde }
      : {}),
    ...(esCategoriaServilletas(categoria)
      ? seccionServilletas === "productos"
        ? {
            seccion: seccionServilletas,
            detalle: nombre,
            formato: formatoServilletas,
            unidad: unidadServilletas,
            porcentaje: porcentajeMolde,
          }
        : { seccion: seccionServilletas, descripcion: nombre }
      : {}),
    precioActual,
    tipoAumento,
    valorAumento,
    precioNuevo,
  };

  if (productoEditandoIndex !== null) {
    productos[productoEditandoIndex] = producto;
  } else {
    productos.push(producto);
  }

  await guardarProductos();
  renderizarTabla();
  renderizarListaPorCategoria();
  limpiarFormulario();
});

guardarRecargosBtn.addEventListener("click", async () => {
  const configuracion = obtenerConfiguracionCategoria(categoriaActiva);

  if (!configuracion) {
    alert("No se encontró la configuración de recargos.");
    return;
  }

  const filas = [...tablaRecargosAdmin.querySelectorAll("tr")];
  const recargos = filas.map((fila) => ({
    descripcion: fila.querySelector(".recargo-descripcion").value.trim(),
    precioUnaCara: Number(fila.querySelector(".recargo-una-cara").value),
    precioDosCaras: Number(fila.querySelector(".recargo-dos-caras").value),
  }));

  if (
    recargos.some(
      (recargo) =>
        !recargo.descripcion ||
        !Number.isFinite(recargo.precioUnaCara) ||
        !Number.isFinite(recargo.precioDosCaras) ||
        recargo.precioUnaCara < 0 ||
        recargo.precioDosCaras < 0
    )
  ) {
    alert("Completá todos los datos de los recargos con importes válidos.");
    return;
  }

  configuracion.recargosImpresion = recargos;
  await guardarProductos();
  renderizarListaPorCategoria();
  alert("Recargos guardados correctamente.");
});

guardarNotaPlatosBtn.addEventListener("click", async () => {
  const configuracion = obtenerConfiguracionCategoria("Platos Dorados");
  const nota = textoNotaPlatosInput.value.trim();

  if (!configuracion || !nota) {
    alert("Ingresá una nota comercial válida.");
    return;
  }

  configuracion.notaComercial = nota;
  await guardarProductos();
  renderizarListaPorCategoria();
  alert("Nota comercial guardada correctamente.");
});

cancelarEdicionBtn.addEventListener("click", () => {
  limpiarFormulario();
});

borrarTodoBtn.addEventListener("click", async () => {
  if (!categoriaActiva) {
    alert("Primero seleccioná una categoría.");
    return;
  }

  const confirmar = confirm(
    `¿Seguro que querés borrar todos los productos de ${categoriaActiva}?`
  );

  if (confirmar) {
    productos = productos.filter(
      (producto) => producto.categoria !== categoriaActiva
    );

    await guardarProductos();
    renderizarTabla();
    renderizarListaPorCategoria();
    limpiarFormulario();
  }
});

exportarCSVBtn.addEventListener("click", () => {
  const productosFiltrados = obtenerProductosDeCategoriaActiva();

  if (productosFiltrados.length === 0) {
    alert("No hay productos para exportar.");
    return;
  }

  let csv =
    "Producto;Categoría;Precio actual;Tipo aumento;Valor aumento;Precio nuevo\n";

  productosFiltrados.forEach((producto) => {
    csv += `${producto.nombre};${producto.categoria};${producto.precioActual};${producto.tipoAumento};${producto.valorAumento};${producto.precioNuevo}\n`;
  });

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const nombreArchivo = categoriaActiva
    ? `lista-${categoriaActiva.toLowerCase().replaceAll(" ", "-")}.csv`
    : "lista-precios-lasa.csv";

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();

  URL.revokeObjectURL(url);
});

aplicarAumentoMasivoBtn.addEventListener("click", async () => {
  const categoria = categoriaActiva;
  const tipoAumento = tipoAumentoMasivoInput.value;
  const valorAumento = Number(valorAumentoMasivoInput.value);
  const seccionAjuste = seccionAjusteInput.classList.contains("oculto")
    ? ""
    : seccionAjusteInput.value;

  if (!categoriaActiva) {
    alert("Primero seleccioná una categoría.");
    return;
  }

  if (valorAumento <= 0) {
    alert("Ingresá un valor de aumento mayor a cero.");
    return;
  }

  const productosDeCategoria = obtenerProductosDeCategoria(categoria);

  if (productosDeCategoria.length === 0) {
    alert("No hay productos cargados en esta categoría.");
    return;
  }

  productos = productos.map((producto) => {
    if (
      producto.categoria === categoria &&
      !esRegistroConfiguracion(producto) &&
      !producto.aCotizar &&
      (!seccionAjuste || producto.seccion === seccionAjuste)
    ) {
      const precioNuevo = calcularPrecioNuevo(
        producto.precioActual,
        tipoAumento,
        valorAumento
      );

      return {
        ...producto,
        tipoAumento,
        valorAumento,
        precioNuevo,
      };
    }

    return producto;
  });

  await guardarProductos();
  renderizarTabla();
  renderizarListaPorCategoria();
  limpiarFormularioMasivo();

  alert("Aumento aplicado correctamente.");
});

descargarPDFBtn.addEventListener("click", () => {
  if (!categoriaResultadoFinal) {
    alert("Primero seleccioná una lista final.");
    return;
  }

  window.print();
});

const modoGuardado = localStorage.getItem("modoOscuroLASA");

function actualizarTextosModo() {
  const estaOscuro = document.body.classList.contains("modo-oscuro");
  const texto = estaOscuro ? "Modo claro" : "Modo oscuro";
  textoModo.textContent = texto;
  textoModoLista.textContent = texto;
}

function alternarModoOscuro() {
  document.body.classList.toggle("modo-oscuro");
  const estaOscuro = document.body.classList.contains("modo-oscuro");
  localStorage.setItem("modoOscuroLASA", estaOscuro ? "activo" : "inactivo");
  actualizarTextosModo();
}

if (modoGuardado === "activo") {
  document.body.classList.add("modo-oscuro");
}

actualizarTextosModo();
modoOscuroBtn.addEventListener("click", alternarModoOscuro);
modoOscuroListaBtn.addEventListener("click", alternarModoOscuro);

async function iniciarApp() {
  renderizarMarcasInstitucionales();
  await cargarProductosDesdeJSON();
  renderizarPanelAdmin();

  if (esModoAdmin) {
    portada.classList.add("oculto");
    portadaAdmin.classList.remove("oculto");
    accesoAdmin.textContent = "Volver a Listas de Precios";
    accesoAdmin.href = "/";
  }
}

iniciarApp();
