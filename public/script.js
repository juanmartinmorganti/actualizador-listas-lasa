const productoInput = document.getElementById("producto");
const categoriaInput = document.getElementById("categoria");
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

const categoriaMasivaInput = document.getElementById("categoriaMasiva");
const tipoAumentoMasivoInput = document.getElementById("tipoAumentoMasivo");
const valorAumentoMasivoInput = document.getElementById("valorAumentoMasivo");
const aplicarAumentoMasivoBtn = document.getElementById("aplicarAumentoMasivo");

const tablaProductos = document.getElementById("tablaProductos");
const listaPorCategoria = document.getElementById("listaPorCategoria");

const portada = document.getElementById("portada");
const portadaAdmin = document.getElementById("portadaAdmin");
const gridAdmin = document.getElementById("gridAdmin");
const moduloCategoria = document.getElementById("moduloCategoria");
const moduloResultadoFinal = document.getElementById("moduloResultadoFinal");

const tituloCategoriaActiva = document.getElementById("tituloCategoriaActiva");
const tituloResultadoFinal = document.getElementById("tituloResultadoFinal");
const fechaActualizacionTexto = document.getElementById("fechaActualizacionTexto");
const fechaActualizacionAdmin = document.getElementById("fechaActualizacionAdmin");
const resultadoFinalCategoria = document.getElementById("resultadoFinalCategoria");

const volverPortadaBtn = document.getElementById("volverPortada");
const volverPortadaResultadoBtn = document.getElementById("volverPortadaResultado");

const botonesListaFinal = document.querySelectorAll(".boton-lista-final");
const categorias = [...botonesListaFinal].map((boton) => boton.dataset.categoria);

let productos = [];
let categoriaActiva = "";
let productoEditandoIndex = null;
let categoriaResultadoFinal = "";
const esModoAdmin =
  window.location.pathname === "/admin" ||
  new URLSearchParams(window.location.search).has("admin");

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
    ? `Última actualización: ${formatearFechaArgentina(fechaGuardada)}`
    : "Sin fecha publicada";
}

function obtenerFechaActualizacion(categoria) {
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
            <button type="button" class="boton-publicar" disabled title="Se habilitará al implementar borradores y publicación">Publicar lista</button>
          </div>
        </article>
      `;
    })
    .join("");
}

function obtenerProductosDeCategoria(categoria) {
  return productos.filter((producto) => producto.categoria === categoria);
}

function obtenerProductosDeCategoriaActiva() {
  if (!categoriaActiva) {
    return productos;
  }

  return obtenerProductosDeCategoria(categoriaActiva);
}

function limpiarFormulario() {
  productoInput.value = "";
  precioActualInput.value = "";
  tipoAumentoInput.value = "sin";
  valorAumentoInput.value = "";

  productoEditandoIndex = null;
  agregarProductoBtn.textContent = "Agregar producto";
  cancelarEdicionBtn.classList.add("oculto");

  if (categoriaActiva) {
    categoriaInput.value = categoriaActiva;
  }
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

  const productosFiltrados = obtenerProductosDeCategoriaActiva();

  if (productosFiltrados.length === 0) {
    tablaProductos.innerHTML = `
      <tr>
        <td colspan="7">No hay productos cargados en esta categoría.</td>
      </tr>
    `;
    return;
  }

  productosFiltrados.forEach((producto) => {
    const indexReal = productos.indexOf(producto);
    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${producto.nombre}</td>
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
    columns: [
      {
        label: "Artículo",
        value: (producto) => producto.nombre,
        align: "left",
        width: "65%",
      },
      {
        label: "Precio unitario",
        value: (producto) => formatearMoneda(producto.precioNuevo),
        align: "right",
        width: "35%",
        className: "precio-final",
      },
    ],
  },
  Moldes: {
    columns: [
      {
        label: "Descripción",
        value: (producto) => producto.nombre,
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
        label: "Porcentaje",
        value: formatearPorcentaje,
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

function formatearPorcentaje(producto) {
  if (producto.tipoAumento !== "porcentaje") {
    return "—";
  }

  return `${Number(producto.valorAumento).toLocaleString("es-AR", {
    maximumFractionDigits: 2,
  })} %`;
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
          ${escaparHTML(columna.label)}
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

function crearListaConfigurada(categoria, productosCategoria) {
  const configuracion = configuracionListas[categoria];

  if (!configuracion) {
    return crearTablaFinalCategoria(categoria, productosCategoria, false);
  }

  const secciones = configuracion.sections || [
    { title: "", matches: () => true },
  ];

  const contenido = secciones
    .map((seccion) => {
      const productosSeccion = productosCategoria.filter(seccion.matches);

      if (productosSeccion.length === 0) {
        return "";
      }

      return `
        <section class="seccion-lista">
          ${seccion.title ? `<h3>${escaparHTML(seccion.title)}</h3>` : ""}
          ${crearTablaConfigurada(configuracion.columns, productosSeccion)}
        </section>
      `;
    })
    .join("");

  const nota = configuracion.percentageNote
    ? `
      <p class="nota-lista">
        Este porcentaje indica cuánto ha aumentado el precio respecto de la
        versión anterior de esta lista.
      </p>
    `
    : "";

  return `${contenido}${nota}`;
}

function renderizarListaPorCategoria() {
  listaPorCategoria.innerHTML = "";

  const productosFiltrados = obtenerProductosDeCategoriaActiva();

  if (productosFiltrados.length === 0) {
    listaPorCategoria.innerHTML = "<p>No hay productos cargados en esta categoría.</p>";
    return;
  }

  listaPorCategoria.innerHTML = crearTablaFinalCategoria(categoriaActiva, productosFiltrados);
}

function renderizarResultadoFinalCategoria(categoria) {
  const productosCategoria = obtenerProductosDeCategoria(categoria);

  categoriaResultadoFinal = categoria;

  tituloResultadoFinal.textContent = categoria;
  resultadoFinalCategoria.innerHTML = "";

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

  productoInput.value = producto.nombre;
  categoriaInput.value = producto.categoria;
  precioActualInput.value = producto.precioActual;
  tipoAumentoInput.value = producto.tipoAumento;
  valorAumentoInput.value = producto.valorAumento;

  agregarProductoBtn.textContent = "Guardar cambios";
  cancelarEdicionBtn.classList.remove("oculto");

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
  document.body.classList.remove("vista-lista");

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

fechaActualizacionAdmin.addEventListener("change", () => {
  if (!categoriaActiva || !fechaActualizacionAdmin.value) {
    return;
  }

  localStorage.setItem(
    obtenerClaveFechaCategoria(categoriaActiva),
    fechaActualizacionAdmin.value
  );
  renderizarPanelAdmin();
});

agregarProductoBtn.addEventListener("click", async () => {
  const nombre = productoInput.value.trim();
  const categoria = categoriaActiva;
  const precioActual = Number(precioActualInput.value);
  const tipoAumento = tipoAumentoInput.value;
  const valorAumento = Number(valorAumentoInput.value) || 0;

  if (!categoriaActiva) {
    alert("Primero seleccioná una categoría.");
    return;
  }

  if (!nombre || precioActual <= 0) {
    alert("Completá producto y precio actual.");
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
    if (producto.categoria === categoria) {
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
