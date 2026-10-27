const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { hashPassword } = require("../auth");

async function puertoLibre() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const puerto = server.address().port;
  server.close();
  await once(server, "close");
  return puerto;
}

test("editar no altera la consulta; publicar cambia precios; cambiar fecha no cambia precios", async (t) => {
  const carpeta = fs.mkdtempSync("/tmp/opencode/listas-flujo-");
  t.after(() => fs.rmSync(carpeta, { recursive: true, force: true }));
  const inicial = [
    { categoria: "Moldes", nombre: "Molde de prueba", precioActual: 100, porcentaje: 0 },
    { categoria: "Moldes", tipoRegistro: "configuracion", fechaPublicacion: "2026-10-20" },
  ];
  fs.writeFileSync(path.join(carpeta, "productos.json"), JSON.stringify(inicial));
  fs.writeFileSync(path.join(carpeta, "publicadas.json"), JSON.stringify(inicial));

  const puerto = await puertoLibre();
  const base = `http://127.0.0.1:${puerto}`;
  const proceso = spawn(process.execPath, ["server.js"], {
    cwd: path.join(__dirname, ".."),
    env: {
      ...process.env,
      PORT: String(puerto), LASA_HOST: "127.0.0.1", LASA_DATA_DIR: carpeta,
      LASA_ADMIN_USER: "prueba", LASA_ADMIN_PASSWORD_HASH: hashPassword("clave-de-prueba-segura"),
      LASA_SESSION_SECRET: "s".repeat(64),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => { if (proceso.exitCode === null) proceso.kill("SIGTERM"); });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("No arrancó el servidor de prueba.")), 5000);
    proceso.stdout.on("data", (datos) => {
      if (datos.toString().includes("Servidor funcionando")) { clearTimeout(timeout); resolve(); }
    });
    proceso.once("exit", (codigo) => { clearTimeout(timeout); reject(new Error(`Servidor de prueba terminó: ${codigo}`)); });
  });

  const consulta = async () => (await (await fetch(`${base}/api/productos`)).json());
  const precio = async () => (await consulta()).find((registro) => registro.nombre === "Molde de prueba").precioActual;
  assert.equal((await fetch(`${base}/api/borrador`)).status, 401);
  assert.equal(await precio(), 100);

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST", headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ usuario: "prueba", contrasena: "clave-de-prueba-segura" }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const escribir = (ruta, contenido) => fetch(`${base}${ruta}`, {
    method: "POST", headers: { Cookie: cookie, Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify(contenido),
  });

  const borrador = structuredClone(inicial);
  borrador[0].precioActual = 150;
  assert.equal((await escribir("/api/productos", borrador)).status, 200);
  assert.equal(await precio(), 100);
  assert.equal((await (await fetch(`${base}/api/borrador`, { headers: { Cookie: cookie } })).json())[0].precioActual, 150);

  assert.equal((await escribir("/api/publicaciones", { categoria: "Moldes", fecha: "2026-10-18" })).status, 200);
  assert.equal(await precio(), 150);
  assert.equal((await consulta()).find((registro) => registro.tipoRegistro === "configuracion").fechaPublicacion, "2026-10-18");
  assert.equal((await escribir("/api/publicaciones/fecha", { categoria: "Moldes", fecha: "2026-10-19" })).status, 200);
  assert.equal(await precio(), 150);
  assert.equal((await consulta()).find((registro) => registro.tipoRegistro === "configuracion").fechaPublicacion, "2026-10-19");
  assert.equal((await (await fetch(`${base}/api/borrador`, { headers: { Cookie: cookie } })).json())[0].precioActual, 150);
});
