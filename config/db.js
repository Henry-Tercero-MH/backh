const mysql = require("mysql2");
require("dotenv").config();

// Validación de las variables de entorno
if (
  !process.env.DB_HOST ||
  !process.env.DB_PORT ||
  !process.env.DB_USER ||
  !process.env.DB_PASSWORD ||
  !process.env.DB_NAME
) {
  throw new Error(
    "Faltan variables de entorno para la configuración de la base de datos."
  );
}

// Creación del pool de conexiones
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "tienda_online",
});

// Manejo del cierre del pool
process.on("SIGINT", () => {
  pool.end((err) => {
    if (err) {
      console.error("Error al cerrar la conexión a la base de datos:", err);
    } else {
      console.log("Conexión a la base de datos cerrada.");
    }
    process.exit(0);
  });
});

module.exports = pool;
