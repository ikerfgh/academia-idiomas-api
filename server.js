const express = require("express");
const cors = require("cors");
const { createHandler } = require("graphql-http/lib/use/express");
const { buildSchema } = require("graphql");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------------------------------------------
// SERVICIO REST — Crear alumnos (público)
// -----------------------------------------------------------------

app.post("/api/alumnos", (req, res) => {
  const {
    nombre, email, telefono, idiomaNativo, idiomaAEstudiar,
    referidoPor, matriculaFamiliar,
  } = req.body;

  if (!nombre || !email || !idiomaNativo || !idiomaAEstudiar) {
    return res.status(400).json({
      error: "Faltan campos requeridos: nombre, email, idiomaNativo, idiomaAEstudiar",
    });
  }

  let descuentoFamiliar = 0;
  if (matriculaFamiliar) {
    const familiar = db
      .prepare("SELECT id FROM alumnos WHERE id = ?")
      .get(matriculaFamiliar);
    if (!familiar) {
      return res.status(404).json({
        error: `No existe un alumno con matrícula ${matriculaFamiliar}`,
      });
    }
    descuentoFamiliar = 1;
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO alumnos
        (nombre, email, telefono, idiomaNativo, idiomaAEstudiar, referidoPor, matriculaFamiliar, descuentoFamiliar)
      VALUES (@nombre, @email, @telefono, @idiomaNativo, @idiomaAEstudiar, @referidoPor, @matriculaFamiliar, @descuentoFamiliar)
    `);
    const info = stmt.run({
      nombre,
      email,
      telefono: telefono || null,
      idiomaNativo,
      idiomaAEstudiar,
      referidoPor: referidoPor || null,
      matriculaFamiliar: matriculaFamiliar || null,
      descuentoFamiliar,
    });

    const nuevoAlumno = db
      .prepare("SELECT * FROM alumnos WHERE id = ?")
      .get(info.lastInsertRowid);

    return res.status(201).json(nuevoAlumno);
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Ya existe un alumno con ese email" });
    }
    return res.status(500).json({ error: "Error interno al crear el alumno" });
  }
});

// Endpoint auxiliar de lectura simple (para poder probar el POST fácilmente)
app.get("/api/alumnos/:id", (req, res) => {
  const alumno = db.prepare("SELECT * FROM alumnos WHERE id = ?").get(req.params.id);
  if (!alumno) return res.status(404).json({ error: "Alumno no encontrado" });
  res.json(alumno);
});

app.get("/", (req, res) => {
  res.json({
    servicio: "API Academia de Idiomas",
    endpoints: {
      rest_crear_alumno: "POST /api/alumnos",
      rest_consultar_alumno_por_id: "GET /api/alumnos/:id",
      graphql: "POST /graphql",
    },
  });
});

// -----------------------------------------------------------------
// SERVICIO GraphQL — Consultar alumnos por filtros
// -----------------------------------------------------------------

const schema = buildSchema(`
  type Alumno {
    id: ID!
    nombre: String!
    email: String!
    telefono: String
    idiomaNativo: String!
    idiomaAEstudiar: String!
    nivel: Int!
    referidoPor: String
    matriculaFamiliar: String
    descuentoFamiliar: Boolean!
    activo: Boolean!
    fechaInscripcion: String!
  }

  type Query {
    alumnos(
      idiomaAEstudiar: String
      nivel: Int
      activo: Boolean
      nombreContiene: String
    ): [Alumno!]!
    alumno(id: ID!): Alumno
  }
`);

function rowToAlumno(row) {
  return {
    ...row,
    descuentoFamiliar: !!row.descuentoFamiliar,
    activo: !!row.activo,
  };
}

const root = {
  alumnos: ({ idiomaAEstudiar, nivel, activo, nombreContiene }) => {
    let sql = "SELECT * FROM alumnos WHERE 1=1";
    const params = [];

    if (idiomaAEstudiar) {
      sql += " AND idiomaAEstudiar = ?";
      params.push(idiomaAEstudiar);
    }
    if (nivel !== undefined && nivel !== null) {
      sql += " AND nivel = ?";
      params.push(nivel);
    }
    if (activo !== undefined && activo !== null) {
      sql += " AND activo = ?";
      params.push(activo ? 1 : 0);
    }
    if (nombreContiene) {
      sql += " AND nombre LIKE ?";
      params.push(`%${nombreContiene}%`);
    }

    const rows = db.prepare(sql).all(...params);
    return rows.map(rowToAlumno);
  },
  alumno: ({ id }) => {
    const row = db.prepare("SELECT * FROM alumnos WHERE id = ?").get(id);
    return row ? rowToAlumno(row) : null;
  },
};

app.all("/graphql", createHandler({ schema, rootValue: root }));

const PORT = process.env.PORT || 3000;

// Solo se levanta el servidor si el archivo se ejecuta directamente
// (así las pruebas pueden importar la app sin abrir el puerto 3000)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
}

module.exports = app;
