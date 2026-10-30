const fs = require('node:fs');
const path = require('node:path');
const { fork } = require('node:child_process');
const express = require('express');
const { crearPlantilla } = require('./pdf-template');

const LIMITES = Object.freeze({ cuerpo: '1kb', datos: 2 * 1024 * 1024, html: 2 * 1024 * 1024,
  pdf: 20 * 1024 * 1024, registros: 5000, tiempo: 20000, concurrencia: 1, porMinuto: 20 });
function fallo(status, message) { return Object.assign(new Error(message), { status }); }
function validarSolicitudPdf(s) {
  if (!s || typeof s !== 'object' || Array.isArray(s)) return 'Solicitud PDF inválida.';
  if (Object.keys(s).some(k => !['tipo', 'categoria', 'fuente'].includes(k))) return 'La solicitud contiene campos no permitidos; no se acepta HTML.';
  if (!['catalogo', 'lista'].includes(s.tipo)) return 'El tipo de documento no es válido.';
  if (s.fuente !== undefined && !['publicadas', 'borrador'].includes(s.fuente)) return 'La fuente no es válida.';
  if (s.tipo === 'lista' && (typeof s.categoria !== 'string' || s.categoria.length > 80 || !s.categoria.trim())) return 'La categoría no es válida.';
  if (s.tipo === 'catalogo' && s.categoria !== undefined) return 'El catálogo no admite categoría.';
  return null;
}
function leerDatosPdf(archivo) {
  const fd = fs.openSync(archivo, 'r');
  try {
    if (!fs.fstatSync(fd).isFile()) throw fallo(503, 'Datos PDF no disponibles.');
    const buffer = Buffer.alloc(LIMITES.datos + 1);
    let total = 0, n;
    while (total < buffer.length && (n = fs.readSync(fd, buffer, total, buffer.length - total, null)) > 0) total += n;
    if (total > LIMITES.datos) throw fallo(413, 'Los datos superan el límite de PDF.');
    const datos = JSON.parse(buffer.subarray(0, total).toString('utf8'));
    if (!Array.isArray(datos) || datos.length > LIMITES.registros) throw fallo(413, 'Cantidad de registros PDF no válida.');
    return datos;
  } finally { fs.closeSync(fd); }
}
function crearDocumentoPdf(datos, solicitud, fecha) {
  const plantilla = crearPlantilla(datos, fecha, solicitud.fuente === 'borrador');
  const categorias = solicitud.tipo === 'catalogo' ? plantilla.categorias : [solicitud.categoria];
  if (categorias.some(c => !plantilla.categorias.includes(c))) throw fallo(400, 'Categoría no válida.');
  if (solicitud.fuente !== 'borrador' && categorias.some(c => !plantilla.estaCategoriaPublicada(c))) throw fallo(409, 'Faltan listas publicadas.');
  const contenido = solicitud.tipo === 'catalogo'
    ? `<div id="moduloCatalogo"><div id="catalogoContenido">${plantilla.catalogo()}</div></div>`
    : `<div id="moduloResultadoFinal">${plantilla.lista(solicitud.categoria)}</div>`;
  const css = fs.readFileSync(path.join(__dirname, 'public/style.css'), 'utf8');
  const logo = fs.readFileSync(path.join(__dirname, 'public/assets/logo-lasa.png')).toString('base64');
  // Sin base URL, estilos remotos ni rutas tomadas del Host o del cuerpo HTTP.
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; script-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'"><style>${css}</style></head><body class="vista-${solicitud.tipo}"><main>${contenido}</main></body></html>`
    .replaceAll('src="/assets/logo-lasa.png"', `src="data:image/png;base64,${logo}"`);
  if (Buffer.byteLength(html) > LIMITES.html) throw fallo(413, 'Documento PDF demasiado grande.');
  return html;
}
function generarPdf(html, { signal, timeout = LIMITES.tiempo } = {}) {
  return new Promise((resolve, reject) => {
    const env = Object.fromEntries(['PATH', 'HOME', 'LANG', 'TMPDIR', 'XDG_CACHE_HOME', 'PUPPETEER_CACHE_DIR', 'PUPPETEER_EXECUTABLE_PATH'].filter(k => process.env[k]).map(k => [k, process.env[k]]));
    const child = fork(path.join(__dirname, 'pdf-worker.js'), [], { detached: process.platform !== 'win32', env, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      // El grupo incluye Chromium y sus descendientes: no dejar trabajo vivo al vencer el plazo.
      try { if (process.platform !== 'win32') process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL'); } catch { /* Ya terminó. */ }
      if (error) reject(error); else resolve(value);
    };
    const abort = () => finish(fallo(499, 'Descarga cancelada.'));
    const timer = setTimeout(() => finish(fallo(504, 'Se agotó el tiempo de generación PDF.')), timeout);
    child.on('error', () => finish(fallo(503, 'No se pudo iniciar el generador PDF.')));
    child.on('exit', () => finish(fallo(503, 'El generador PDF terminó sin resultado.')));
    child.on('message', message => {
      if (message?.error) return finish(fallo(503, 'No se pudo generar el PDF con aislamiento seguro.'));
      if (typeof message?.pdf !== 'string' || message.pdf.length > Math.ceil(LIMITES.pdf / 3) * 4) return finish(fallo(413, 'PDF demasiado grande o inválido.'));
      const pdf = Buffer.from(message.pdf, 'base64');
      if (pdf.length > LIMITES.pdf || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) return finish(fallo(503, 'Resultado PDF inválido.'));
      finish(null, pdf);
    });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    child.send({ html }, error => { if (error) finish(fallo(503, 'No se pudo enviar el documento PDF.')); });
  });
}
function crearManejadorPdf({ dataDir, generar = generarPdf, ahora = () => new Date() }) {
  let activos = 0, ventana = 0, cantidad = 0;
  return async (req, res) => {
    const error = validarSolicitudPdf(req.body);
    if (error) return res.status(400).json({ error });
    const now = ahora();
    if (now.getTime() - ventana >= 60000) { ventana = now.getTime(); cantidad = 0; }
    if (activos >= LIMITES.concurrencia || cantidad >= LIMITES.porMinuto) return res.set('Retry-After', '60').status(429).json({ error: 'Generador PDF ocupado. Intentá más tarde.' });
    activos++; cantidad++;
    const controller = new AbortController();
    const cancel = () => { if (!res.writableEnded) controller.abort(); };
    res.on('close', cancel);
    try {
      const archivo = path.join(dataDir, req.body.fuente === 'borrador' ? 'productos.json' : 'publicadas.json');
      const datos = leerDatosPdf(archivo);
      const fecha = now.toISOString().slice(0, 10);
      const html = crearDocumentoPdf(datos, req.body, fecha);
      const pdf = await generar(html, { signal: controller.signal });
      if (res.destroyed) return;
      const prefijo = req.body.tipo === 'catalogo' ? 'Listas-de-Precios-LASA' : 'Lista-de-Precios-LASA';
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${prefijo}-${fecha}.pdf"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).send(pdf);
    } catch (e) {
      if (!res.destroyed) res.status(e.status || 503).json({ error: e.status ? e.message : 'No se pudo generar el PDF.' });
    } finally { res.off('close', cancel); activos--; }
  };
}
function registrarPdf(app, { auth, dataDir, generar }) {
  app.post('/api/pdf', express.json({ limit: LIMITES.cuerpo, strict: true }), (req, res, next) => {
    if (req.body?.fuente === 'borrador') return auth.requireAdmin(req, res, next);
    next();
  }, crearManejadorPdf({ dataDir, generar }));
  app.use('/api/pdf', (error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Solicitud PDF demasiado grande.' });
    if (error instanceof SyntaxError) return res.status(400).json({ error: 'JSON PDF inválido.' });
    next(error);
  });
}
module.exports = { registrarPdf, LIMITES, validarSolicitudPdf, leerDatosPdf, crearDocumentoPdf, generarPdf, crearManejadorPdf };
