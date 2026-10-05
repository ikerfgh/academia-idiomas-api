// Pruebas del servicio REST: POST /api/alumnos y GET /api/alumnos/:id
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Base de datos temporal, para no tocar academia.db
process.env.DB_PATH = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "academia-rest-")),
  "test.db"
);

const app = require("../server");

let server;
let base;

test.before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
});

function crearAlumno(datos) {
  return fetch(`${base}/api/alumnos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

const alumnoValido = {
  nombre: "Ana Torres",
  email: "ana@example.com",
  idiomaNativo: "Español",
  idiomaAEstudiar: "Ingles",
};

test("POST con datos válidos responde 201 y devuelve el alumno", async () => {
  const res = await crearAlumno(alumnoValido);
  assert.strictEqual(res.status, 201);
  const alumno = await res.json();
  assert.strictEqual(typeof alumno.id, "number");
  assert.strictEqual(alumno.nombre, "Ana Torres");
  assert.strictEqual(alumno.nivel, 1);
  assert.strictEqual(alumno.descuentoFamiliar, 0);
  assert.strictEqual(alumno.activo, 1);
});

test("POST responde en menos de 1 segundo", async () => {
  const inicio = Date.now();
  const res = await crearAlumno({ ...alumnoValido, email: "rapido@example.com" });
  const duracion = Date.now() - inicio;
  assert.strictEqual(res.status, 201);
  assert.ok(duracion < 1000, `Tardó ${duracion} ms`);
});

test("POST sin campos requeridos responde 400", async () => {
  const sinNombre = await crearAlumno({ email: "x@example.com", idiomaNativo: "Español", idiomaAEstudiar: "Ingles" });
  assert.strictEqual(sinNombre.status, 400);
  const sinEmail = await crearAlumno({ nombre: "Sin Email", idiomaNativo: "Español", idiomaAEstudiar: "Ingles" });
  assert.strictEqual(sinEmail.status, 400);
  const sinIdioma = await crearAlumno({ nombre: "Sin Idioma", email: "idioma@example.com" });
  assert.strictEqual(sinIdioma.status, 400);
});

test("POST con un email repetido responde 409", async () => {
  const datos = { ...alumnoValido, email: "repetido@example.com" };
  const primero = await crearAlumno(datos);
  assert.strictEqual(primero.status, 201);
  const segundo = await crearAlumno(datos);
  assert.strictEqual(segundo.status, 409);
});

test("POST con una matrícula familiar que no existe responde 404", async () => {
  const res = await crearAlumno({
    ...alumnoValido,
    email: "familiar404@example.com",
    matriculaFamiliar: "99999",
  });
  assert.strictEqual(res.status, 404);
});

test("POST con una matrícula familiar válida aplica el descuento", async () => {
  const familiar = await (await crearAlumno({ ...alumnoValido, email: "hermano@example.com" })).json();
  const res = await crearAlumno({
    ...alumnoValido,
    email: "hermana@example.com",
    matriculaFamiliar: String(familiar.id),
  });
  assert.strictEqual(res.status, 201);
  const alumno = await res.json();
  assert.strictEqual(alumno.descuentoFamiliar, 1);
  assert.strictEqual(alumno.matriculaFamiliar, String(familiar.id));
});

test("GET /api/alumnos/:id devuelve el alumno creado", async () => {
  const creado = await (await crearAlumno({ ...alumnoValido, email: "consulta@example.com" })).json();
  const res = await fetch(`${base}/api/alumnos/${creado.id}`);
  assert.strictEqual(res.status, 200);
  const alumno = await res.json();
  assert.strictEqual(alumno.email, "consulta@example.com");
});

test("GET /api/alumnos/:id con un id inexistente responde 404", async () => {
  const res = await fetch(`${base}/api/alumnos/99999`);
  assert.strictEqual(res.status, 404);
});
