// Pruebas del servicio GraphQL: consulta de alumnos con filtros
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Base de datos temporal, para no tocar academia.db
process.env.DB_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "academia-graphql-")),
  "test.db"
);

const app = require("../server");
const db = require("../db");

let server;
let base;

async function crear(datos) {
  const res = await fetch(`${base}/api/alumnos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  return res.json();
}

async function consulta(query) {
  const res = await fetch(`${base}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return res.json();
}

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;

  // Datos de prueba
  const ana = await crear({ nombre: "Ana Torres", email: "ana@example.com", idiomaNativo: "Español", idiomaAEstudiar: "Ingles" });
  await crear({ nombre: "Luis Pérez", email: "luis@example.com", idiomaNativo: "Español", idiomaAEstudiar: "Frances" });
  const marie = await crear({ nombre: "Marie Dupont", email: "marie@example.com", idiomaNativo: "Frances", idiomaAEstudiar: "Ingles" });
  await crear({ nombre: "Ana Gómez", email: "anag@example.com", idiomaNativo: "Español", idiomaAEstudiar: "Ingles", matriculaFamiliar: String(ana.id) });

  // Marie sube a nivel 2 y queda inactiva (no hay endpoint para esto, se hace en la base de datos)
  db.prepare("UPDATE alumnos SET nivel = 2, activo = 0 WHERE id = ?").run(marie.id);
});

test.after(() => {
  server.close();
});

test("alumnos sin filtros devuelve a todos", async () => {
  const r = await consulta("{ alumnos { id nombre } }");
  assert.strictEqual(r.data.alumnos.length, 4);
});

test("filtra por idiomaAEstudiar", async () => {
  const r = await consulta('{ alumnos(idiomaAEstudiar: "Frances") { nombre } }');
  assert.deepStrictEqual(r.data.alumnos.map((a) => a.nombre), ["Luis Pérez"]);
});

test("filtra por nivel", async () => {
  const r = await consulta("{ alumnos(nivel: 2) { nombre } }");
  assert.deepStrictEqual(r.data.alumnos.map((a) => a.nombre), ["Marie Dupont"]);
});

test("filtra por activo", async () => {
  const r = await consulta("{ alumnos(activo: false) { nombre } }");
  assert.deepStrictEqual(r.data.alumnos.map((a) => a.nombre), ["Marie Dupont"]);
});

test("filtra por nombreContiene", async () => {
  const r = await consulta('{ alumnos(nombreContiene: "Ana") { nombre } }');
  assert.deepStrictEqual(r.data.alumnos.map((a) => a.nombre).sort(), ["Ana Gómez", "Ana Torres"]);
});

test("combina filtros (idioma, nivel y activo)", async () => {
  const r = await consulta('{ alumnos(idiomaAEstudiar: "Ingles", nivel: 1, activo: true) { nombre } }');
  assert.deepStrictEqual(r.data.alumnos.map((a) => a.nombre).sort(), ["Ana Gómez", "Ana Torres"]);
});

test("un filtro sin coincidencias devuelve una lista vacía sin error", async () => {
  const r = await consulta('{ alumnos(idiomaAEstudiar: "Aleman") { nombre } }');
  assert.strictEqual(r.errors, undefined);
  assert.deepStrictEqual(r.data.alumnos, []);
});

test("alumno(id) devuelve un alumno y marca el descuento familiar", async () => {
  const lista = await consulta('{ alumnos(nombreContiene: "Gómez") { id } }');
  const id = lista.data.alumnos[0].id;
  const r = await consulta(`{ alumno(id: ${id}) { nombre descuentoFamiliar } }`);
  assert.strictEqual(r.data.alumno.nombre, "Ana Gómez");
  assert.strictEqual(r.data.alumno.descuentoFamiliar, true);
});

test("alumno(id) con un id inexistente devuelve null", async () => {
  const r = await consulta("{ alumno(id: 99999) { nombre } }");
  assert.strictEqual(r.data.alumno, null);
});

test("la consulta con filtros combinados responde en menos de 1.5 segundos", async () => {
  const inicio = Date.now();
  await consulta('{ alumnos(idiomaAEstudiar: "Ingles", nivel: 1, activo: true) { id nombre nivel } }');
  const duracion = Date.now() - inicio;
  assert.ok(duracion < 1500, `Tardó ${duracion} ms`);
});
