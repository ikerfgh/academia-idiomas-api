# API — Sistema de Gestión de Academia de Idiomas

Servicio REST (crear alumnos) y servicio GraphQL (consultar alumnos), ambos sobre
la misma base de datos SQLite, como lo pide la Práctica #1.

## Ejecutar localmente

```bash
npm install
node server.js
```

El servidor queda escuchando en `http://localhost:3000`.

## Servicio REST — Crear alumno

**POST** `/api/alumnos`

Body (JSON):

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre completo del alumno |
| `email` | string | Sí | Correo, debe ser único |
| `telefono` | string | No | Teléfono de contacto |
| `idiomaNativo` | string | Sí | Idioma nativo del alumno |
| `idiomaAEstudiar` | string | Sí | Idioma que va a estudiar |
| `referidoPor` | string | No | Quién lo recomendó |
| `matriculaFamiliar` | string | No | ID de un alumno ya inscrito (aplica 5% de descuento) |

Ejemplo:

```bash
curl -X POST https://TU-URL-DE-RENDER.onrender.com/api/alumnos \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Ana Torres",
    "email": "ana@example.com",
    "idiomaNativo": "Español",
    "idiomaAEstudiar": "Ingles",
    "referidoPor": "Luis"
  }'
```

Respuesta `201 Created`:

```json
{
  "id": 1,
  "nombre": "Ana Torres",
  "email": "ana@example.com",
  "telefono": null,
  "idiomaNativo": "Español",
  "idiomaAEstudiar": "Ingles",
  "nivel": 1,
  "referidoPor": "Luis",
  "matriculaFamiliar": null,
  "descuentoFamiliar": 0,
  "activo": 1,
  "fechaInscripcion": "2026-09-01 15:59:29"
}
```

Errores posibles:
- `400` — Faltan campos requeridos.
- `404` — La `matriculaFamiliar` indicada no existe.
- `409` — Ya existe un alumno con ese email.

**GET** `/api/alumnos/:id` — endpoint auxiliar para verificar que el alumno se creó.

## Servicio GraphQL — Consultar alumnos

**POST** `/graphql`

Query disponible:

```graphql
{
  alumnos(idiomaAEstudiar: "Ingles", nivel: 1, activo: true, nombreContiene: "Ana") {
    id
    nombre
    email
    idiomaAEstudiar
    nivel
    descuentoFamiliar
  }
}
```

Todos los filtros son opcionales y se pueden combinar. También existe:

```graphql
{
  alumno(id: 2) {
    id
    nombre
    matriculaFamiliar
    descuentoFamiliar
  }
}
```

Ejemplo con `curl`:

```bash
curl -X POST https://TU-URL-DE-RENDER.onrender.com/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ alumnos(idiomaAEstudiar: \"Ingles\") { id nombre nivel } }"}'
```

## Base de datos

SQLite (`academia.db`), se crea automáticamente al iniciar el servidor. Es la misma
base de datos que consultan tanto el servicio REST como el servicio GraphQL.
