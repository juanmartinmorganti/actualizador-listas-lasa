const productoInput = document.getElementById("producto");
const categoriaInput = document.getElementById("categoria");
const precioActualInput = document.getElementById("precioActual");
const tipoAumentoInput = document.getElementById("tipoAumento");
const valorAumentoInput = document.getElementById("valorAumento");

const modoOscuroBtn = document.getElementById("modoOscuroBtn");

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
const moduloCategoria = document.getElementById("moduloCategoria");
const moduloResultadoFinal = document.getElementById("moduloResultadoFinal");

const tituloCategoriaActiva = document.getElementById("tituloCategoriaActiva");
const tituloResultadoFinal = document.getElementById("tituloResultadoFinal");
const tituloPDF = document.getElementById("tituloPDF");
const fechaActualizacionInput = document.getElementById("fechaActualizacion");
const fechaActualizacionPDF = document.getElementById("fechaActualizacionPDF");
const resultadoFinalCategoria = document.getElementById("resultadoFinalCategoria");

const volverPortadaBtn = document.getElementById("volverPortada");
const volverPortadaResultadoBtn = document.getElementById("volverPortadaResultado");

const botonesCategoria = document.querySelectorAll(".boton-categoria");
const botonesListaFinal = document.querySelectorAll(".boton-lista-final");

let productos = [];
let categoriaActiva = "";
let productoEditandoIndex = null;
let categoriaResultadoFinal = "";

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
  return valor.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
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
  const clave = obtenerClaveFechaCategoria(categoria);
  const fechaGuardada = localStorage.getItem(clave) || obtenerFechaHoyISO();

  fechaActualizacionInput.value = fechaGuardada;
  fechaActualizacionPDF.textContent = `Fecha de actualización: ${formatearFechaArgentina(fechaGuardada)}`;
}

function guardarFechaActualizacion(categoria, fecha) {
  const clave = obtenerClaveFechaCategoria(categoria);
  localStorage.setItem(clave, fecha);

  fechaActualizacionPDF.textContent = `Fecha de actualización: ${formatearFechaArgentina(fecha)}`;
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

function crearTablaFinalCategoria(categoria, productosCategoria) {
  let contenido = `
    <div class="bloque-categoria">
      <h3>${categoria}</h3>
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

  tituloResultadoFinal.textContent = `Resultado final - ${categoria}`;
  tituloPDF.textContent = `Lista de precios - ${categoria}`;
  resultadoFinalCategoria.innerHTML = "";

  cargarFechaActualizacion(categoria);

  if (productosCategoria.length === 0) {
    resultadoFinalCategoria.innerHTML = "<p>No hay productos cargados en esta categoría.</p>";
    return;
  }

  resultadoFinalCategoria.innerHTML = crearTablaFinalCategoria(categoria, productosCategoria);
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
  moduloResultadoFinal.classList.add("oculto");
  moduloCategoria.classList.remove("oculto");

  tituloCategoriaActiva.textContent = categoria;

  categoriaInput.value = categoria;
  categoriaMasivaInput.value = categoria;

  limpiarFormulario();
  limpiarFormularioMasivo();

  renderizarTabla();
  renderizarListaPorCategoria();
}

function abrirResultadoFinal(categoria) {
  categoriaActiva = "";

  portada.classList.add("oculto");
  moduloCategoria.classList.add("oculto");
  moduloResultadoFinal.classList.remove("oculto");

  renderizarResultadoFinalCategoria(categoria);
}

function volverALaPortada() {
  categoriaActiva = "";
  categoriaResultadoFinal = "";

  moduloCategoria.classList.add("oculto");
  moduloResultadoFinal.classList.add("oculto");
  portada.classList.remove("oculto");

  limpiarFormulario();
  limpiarFormularioMasivo();
}

botonesCategoria.forEach((boton) => {
  boton.addEventListener("click", () => {
    const categoria = boton.dataset.categoria;
    abrirModuloCategoria(categoria);
  });
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

fechaActualizacionInput.addEventListener("change", () => {
  if (!categoriaResultadoFinal) {
    return;
  }

  guardarFechaActualizacion(categoriaResultadoFinal, fechaActualizacionInput.value);
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

if (modoGuardado === "activo") {
  document.body.classList.add("modo-oscuro");
  modoOscuroBtn.textContent = "Modo claro";
}

modoOscuroBtn.addEventListener("click", () => {
  document.body.classList.toggle("modo-oscuro");

  const estaOscuro = document.body.classList.contains("modo-oscuro");

  if (estaOscuro) {
    modoOscuroBtn.textContent = "Modo claro";
    localStorage.setItem("modoOscuroLASA", "activo");
  } else {
    modoOscuroBtn.textContent = "Modo oscuro";
    localStorage.setItem("modoOscuroLASA", "inactivo");
  }
});

async function iniciarApp() {
  await cargarProductosDesdeJSON();
}

iniciarApp();
