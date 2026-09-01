const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "academia.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS alumnos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    telefono TEXT,
    idiomaNativo TEXT NOT NULL,
    idiomaAEstudiar TEXT NOT NULL,
    nivel INTEGER DEFAULT 1,
    referidoPor TEXT,
    matriculaFamiliar TEXT,
    descuentoFamiliar INTEGER DEFAULT 0,
    activo INTEGER DEFAULT 1,
    fechaInscripcion TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;
