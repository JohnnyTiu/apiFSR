import app from "./src/app.js";
import pool from "./src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8800;

async function startServer() {
  try {
    // Comprobar la conexión activa con el pool de MySQL
    const connection = await pool.getConnection();
    console.log("✅ Conexión con el Pool de MySQL establecida exitosamente.");
    connection.release();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📡 Health Check disponible en http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error("❌ Error fatal al conectar con la base de datos:", error.message);
    process.exit(1);
  }
}

startServer();