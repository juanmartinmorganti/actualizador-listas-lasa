const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const express = require('express');
const puppeteer = require('puppeteer');
const { createAuth, hashPassword } = require('../auth');
const { LIMITES, validarSolicitudPdf, crearDocumentoPdf, leerDatosPdf, registrarPdf, generarPdf } = require('../pdf');
const { crearPlantilla } = require('../pdf-template');
const { renderizar } = require('../pdf-worker');
const publicados = [
  { categoria: 'Moldes', nombre: 'Molde publicado', descripcion: 'Molde publicado', precioActual: 100.1 },
  { categoria: 'Moldes', tipoRegistro: 'configuracion', fechaPublicacion: '2026-10-20' },
];
async function entorno(t, generar) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lasa-pdf-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'publicadas.json'), JSON.stringify(publicados));
  fs.writeFileSync(path.join(dir, 'productos.json'), JSON.stringify(publicados.map(x => x.nombre ? { ...x, nombre: 'BORRADOR PRIVADO', descripcion: 'BORRADOR PRIVADO', precioActual: 999 } : x)));
  const app = express();
  const auth = createAuth({ username: 'prueba', passwordHash: hashPassword('clave-de-prueba'), secret: 's'.repeat(64) });
  registrarPdf(app, { auth, dataDir: dir, generar });
  app.use(express.json({ limit: '10mb' }));
  auth.register(app);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (body, headers = {}) => fetch(`${base}/api/pdf`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  return { dir, post, base };
}

test('PDF acepta solo parámetros declarativos; rechaza HTML, URLs, fechas y categorías inválidas', () => {
  assert.equal(validarSolicitudPdf({ tipo: 'lista', categoria: 'Moldes' }), null);
  assert.equal(validarSolicitudPdf({ tipo: 'catalogo' }), null);
  for (const s of [null, [], {}, { tipo: 'otro' }, { tipo: 'lista' }, { tipo: 'catalogo', categoria: 'Moldes' }, { tipo: 'lista', categoria: 'x'.repeat(81) }, { tipo: 'catalogo', fuente: 'otro' }, ...['html', 'url', 'fecha', 'origen', '__proto__'].map(k => JSON.parse(`{"tipo":"catalogo","${k}":"ataque"}`))]) assert.ok(validarSolicitudPdf(s));
});
test('documento usa solo datos locales y conserva precios, fechas, estilos y logo', () => {
  const original = JSON.stringify(publicados);
  const html = crearDocumentoPdf(publicados, { tipo: 'lista', categoria: 'Moldes' }, '2026-10-29');
  assert.match(html, /Molde publicado/); assert.match(html, /\$ 101/);
  assert.match(html, /20\/10\/2026/); assert.match(html, /vista-lista/);
  assert.match(html, /<style>/); assert.match(html, /data:image\/png;base64,/);
  assert.doesNotMatch(html, /<base|<script|src="https?:|href="https?:/);
  assert.equal(JSON.stringify(publicados), original);
});
test('escapa texto malicioso y no genera categorías desconocidas o sin publicar', () => {
  const datos = structuredClone(publicados); datos[0].descripcion = '<script>ataque()</script><img src="http://127.0.0.1/">';
  const html = crearDocumentoPdf(datos, { tipo: 'lista', categoria: 'Moldes' }, '2026-10-29');
  assert.match(html, /&lt;script&gt;/); assert.doesNotMatch(html, /<script>/);
  assert.throws(() => crearDocumentoPdf(datos, { tipo: 'lista', categoria: '../../etc/passwd' }, '2026-10-29'), e => e.status === 400);
  assert.throws(() => crearDocumentoPdf([], { tipo: 'lista', categoria: 'Moldes' }, '2026-10-29'), e => e.status === 409);
  assert.throws(() => crearDocumentoPdf(datos, { tipo: 'catalogo' }, '2026-10-29'), e => e.status === 409);
});
test('las plantillas de todas las categorías mantienen paridad con el cliente comercial', () => {
  // Solo lectura de los datos copiados: no ejecutar precios ni escrituras operativas.
  const categorias = ['Bolsas Fast Food', 'Bolsas Blanca Extra', 'Bolsas Blanca II', 'Bolsas Kraft', 'Cartonería', 'Moldes', 'Papeles', 'Platos Dorados', 'Servilletas'];
  const datos = categorias.flatMap(categoria => {
    const producto = { categoria, nombre: 'Producto de prueba', descripcion: 'Descripción de prueba', detalle: 'Detalle', precioActual: 100.1, porcentaje: 5, medida: '10 cm', codigo: '1', numero: '1', ancho: 10, largo: 20, fuelle: 5, diametro: 10, unidadesPorBulto: 100, unidadesPorCaja: 100, formato: 'A4', unidad: 'Bulto', seccion: categoria === 'Cartonería' ? 'economicas-rectangulares' : categoria === 'Papeles' ? 'papeles-principales' : 'productos' };
    return [producto, { categoria, tipoRegistro: 'configuracion', fechaPublicacion: '2026-10-20', fechaPublicacionImpresion: '2026-10-19', productosPublicados: [{ ...producto }], recargosImpresion: [{ descripcion: 'Recargo de prueba', precioUnaCara: 10, precioDosCaras: 20 }], notaComercial: 'Nota de prueba' }];
  });
  const source = fs.readFileSync(path.join(__dirname, '../public/script.js'), 'utf8');
  const context = vm.createContext({ document: { getElementById: () => ({}), querySelectorAll: () => [] }, window: { location: { pathname: '/', search: '' } }, URLSearchParams, PricingLASA: require('../public/pricing'), localStorage: { getItem: () => '' } });
  vm.runInContext(source.slice(0, source.indexOf('gridAdmin.addEventListener')), context);
  context.fixture = datos;
  vm.runInContext('productos = fixture;', context);
  const renderer = crearPlantilla(datos, '2026-10-29');
  for (const categoria of renderer.categorias) {
    context.categoriaPrueba = categoria;
    assert.equal(renderer.categoria(categoria), vm.runInContext('crearCategoriaCatalogo(categoriaPrueba)', context), categoria);
  }
  assert.match(crearDocumentoPdf(datos, { tipo: 'catalogo' }, '2026-10-29'), /catalogo-portada/);
});
test('lectura acotada rechaza datos gigantes, inválidos y exceso de registros', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lasa-pdf-size-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 'test.json');
  fs.writeFileSync(file, ' '.repeat(LIMITES.datos + 1)); assert.throws(() => leerDatosPdf(file), e => e.status === 413);
  fs.writeFileSync(file, JSON.stringify(Array(LIMITES.registros + 1).fill({}))); assert.throws(() => leerDatosPdf(file), e => e.status === 413);
  fs.writeFileSync(file, '{'); assert.throws(() => leerDatosPdf(file));
  const datos = structuredClone(publicados); datos[0].descripcion = '&'.repeat(500000);
  assert.throws(() => crearDocumentoPdf(datos, { tipo: 'lista', categoria: 'Moldes' }, '2026-10-29'), e => e.status === 413);
});
test('descarga pública sin sesión; ningún precio ni archivo se escribe', async t => {
  let recibido;
  const { post, dir } = await entorno(t, async html => { recibido = html; return Buffer.from('%PDF-1.4\nprueba'); });
  const antes = ['productos.json', 'publicadas.json'].map(f => fs.readFileSync(path.join(dir, f)));
  const r = await post({ tipo: 'lista', categoria: 'Moldes' });
  assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /application\/pdf/);
  assert.match(r.headers.get('content-disposition'), /attachment/); assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(await r.text(), /^%PDF-/); assert.match(recibido, /Molde publicado/); assert.doesNotMatch(recibido, /BORRADOR PRIVADO|\$ 999/);
  ['productos.json', 'publicadas.json'].forEach((f, i) => assert.deepEqual(fs.readFileSync(path.join(dir, f)), antes[i]));
});
test('parser rechaza tamaño excesivo, JSON inválido, HTML y falta de publicación sin lanzar Chromium', async t => {
  let llamadas = 0;
  const { post } = await entorno(t, async () => { llamadas++; return Buffer.from('%PDF-'); });
  assert.equal((await post({ tipo: 'catalogo', html: 'x'.repeat(2000) })).status, 413);
  assert.equal((await post('{')).status, 400);
  assert.equal((await post({ tipo: 'catalogo', html: '<script>ataque()</script>' })).status, 400);
  assert.equal((await post({ tipo: 'lista', categoria: 'desconocida' })).status, 400);
  assert.equal((await post({ tipo: 'catalogo' })).status, 409);
  assert.equal(llamadas, 0);
});
test('el borrador PDF conserva la autenticación y control de origen existentes', async t => {
  let recibido;
  const { post, base } = await entorno(t, async html => { recibido = html; return Buffer.from('%PDF-1.4'); });
  const body = { tipo: 'lista', categoria: 'Moldes', fuente: 'borrador' };
  assert.equal((await post(body)).status, 401);
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base }, body: JSON.stringify({ usuario: 'prueba', contrasena: 'clave-de-prueba' }) });
  const Cookie = login.headers.get('set-cookie').split(';')[0];
  assert.equal((await post(body, { Cookie, Origin: 'http://otro' })).status, 403);
  assert.equal((await post(body, { Cookie, Origin: base })).status, 200);
  assert.match(recibido, /BORRADOR PRIVADO/);
});
test('una sola generación simultánea, rechaza exceso y libera cupo tras fallo', async t => {
  let inicio, terminar; const iniciado = new Promise(r => { inicio = r; });
  const { post } = await entorno(t, () => { inicio(); return new Promise((resolve, reject) => { terminar = reject; }); });
  const body = { tipo: 'lista', categoria: 'Moldes' };
  const primera = post(body); await iniciado;
  const ocupada = await post(body); assert.equal(ocupada.status, 429); assert.ok(ocupada.headers.get('retry-after'));
  terminar(new Error('Fallo ficticio')); assert.equal((await primera).status, 503);
  const segunda = post(body); await new Promise(r => setTimeout(r, 30)); terminar(new Error('Otro fallo')); assert.equal((await segunda).status, 503);
});
test('el límite de frecuencia público es global y acotado', async t => {
  const { post } = await entorno(t, async () => Buffer.from('%PDF-1.4'));
  const body = { tipo: 'lista', categoria: 'Moldes' };
  for (let i = 0; i < LIMITES.porMinuto; i++) assert.equal((await post(body)).status, 200);
  assert.equal((await post(body)).status, 429);
});
test('el cliente envía identificadores y nunca HTML ni fechas', () => {
  const script = fs.readFileSync(path.join(__dirname, '../public/script.js'), 'utf8');
  const context = vm.createContext({ esModoAdmin: false, obtenerFechaHoyISO: () => '2026-10-29', URL: { createObjectURL: () => 'blob:prueba', revokeObjectURL() {} }, document: { createElement: () => ({ click() {} }) }, alert() {}, console, fetch: async (url, options) => { context.solicitud = JSON.parse(options.body); return { ok: true, blob: async () => ({}), headers: { get: () => '' } }; } });
  const start = script.indexOf('async function descargarPdfGenerado('), end = script.indexOf('\ndescargarCatalogoBtn.addEventListener', start);
  vm.runInContext(script.slice(start, end), context);
  return vm.runInContext('descargarPdfGenerado("lista", { textContent: "PDF" }, "Moldes")', context).then(() => assert.equal(JSON.stringify(context.solicitud), '{"tipo":"lista","categoria":"Moldes"}'));
});
test('plazo total mata el trabajador; cancelar también termina sin esperar a Chromium', async () => {
  await assert.rejects(generarPdf('<p>Prueba</p>', { timeout: 1 }), e => e.status === 504);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(generarPdf('<p>Prueba</p>', { signal: controller.signal }), e => e.status === 499);
});
test('Chromium real con sandbox: PDF, logo local, JS deshabilitado y recursos bloqueados', { timeout: 25000 }, async t => {
  const app = express(); let visitas = 0; app.use((req, res) => { visitas++; res.send('recurso'); });
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const browser = await puppeteer.launch({ headless: true, timeout: 8000, args: ['--disable-crash-reporter', '--disable-background-networking'] });
  t.after(() => browser.close());
  assert.ok(!browser.process().spawnargs.includes('--no-sandbox'));
  const page = await browser.newPage();
  const host = `http://127.0.0.1:${server.address().port}`;
  const html = crearDocumentoPdf(publicados, { tipo: 'lista', categoria: 'Moldes' }, '2026-10-29');
  const pdf = await renderizar(page, html);
  assert.equal(Buffer.from(pdf).subarray(0, 5).toString(), '%PDF-');
  assert.equal(await page.$eval('img', img => img.naturalWidth > 0), true);
  const atacante = await browser.newPage();
  const intentos = []; atacante.on('request', r => intentos.push(r.url()));
  await renderizar(atacante, `<script>document.body.dataset.inseguro='si';fetch('${host}/script')</script><img src="${host}/local"><img src="https://example.invalid/externo"><iframe src="file:///etc/passwd"></iframe><iframe src="http://169.254.169.254/"></iframe><style>@import url('${host}/css');</style>`);
  assert.equal(await atacante.evaluate(() => document.body.dataset.inseguro), undefined);
  assert.equal(atacante.isJavaScriptEnabled(), false); assert.equal(visitas, 0);
  assert.ok(intentos.some(url => url.includes('/local')));
});
test('trabajador real produce PDF público con el mismo aislamiento y limpieza', { timeout: 25000 }, async () => {
  const pdf = await generarPdf(crearDocumentoPdf(publicados, { tipo: 'lista', categoria: 'Moldes' }, '2026-10-29'));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
});

test('endpoint público real devuelve PDF sin sesión usando únicamente publicaciones', { timeout: 25000 }, async t => {
  const { post, dir } = await entorno(t);
  const antes = fs.readFileSync(path.join(dir, 'publicadas.json'));
  const respuesta = await post({ tipo: 'lista', categoria: 'Moldes' });
  assert.equal(respuesta.status, 200);
  assert.match(respuesta.headers.get('content-type'), /application\/pdf/);
  assert.equal(Buffer.from(await respuesta.arrayBuffer()).subarray(0, 5).toString(), '%PDF-');
  assert.deepEqual(fs.readFileSync(path.join(dir, 'publicadas.json')), antes);
});

test('sin Chromium utilizable falla cerrado; no reintenta sin sandbox', { timeout: 15000 }, async () => {
  const anterior = process.env.PUPPETEER_EXECUTABLE_PATH;
  process.env.PUPPETEER_EXECUTABLE_PATH = '/ruta-inexistente-lasa/chrome';
  try { await assert.rejects(generarPdf('<p>Prueba</p>'), e => e.status === 503); }
  finally { if (anterior === undefined) delete process.env.PUPPETEER_EXECUTABLE_PATH; else process.env.PUPPETEER_EXECUTABLE_PATH = anterior; }
});
