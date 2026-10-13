import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function runSeed() {
  console.log("Conectando a MySQL para inicializar la base de datos...");
  let connection;
  try {
    // Conectar sin especificar base de datos inicialmente para crearla si no existe
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT) || 3306,
      multipleStatements: true,
    });

    console.log("Conexión exitosa a MySQL.");
    const sqlPath = path.join(__dirname, "schema.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Ejecutando schema.sql...");
    await connection.query(sql);

    console.log("✅ Base de datos 'farmacia_sanrafa' y datos semilla creados correctamente.");
  } catch (error) {
    console.error("❌ Error al inicializar la base de datos:", error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runSeed();
