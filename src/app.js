import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Importación de módulos REST
import usuariosRoutes from "./modules/usuarios/usuarios.routes.js";
import inventarioRoutes from "./modules/inventario/inventario.routes.js";
import facturacionRoutes from "./modules/facturacion/facturacion.routes.js";
import reportesRoutes from "./modules/reportes/reportes.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();

// Middlewares de seguridad y registro
app.use(helmet());
app.use(morgan("dev"));

// Configuración de CORS segura
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como Postman o curl) o si coincide con los autorizados
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Acceso bloqueado por política de CORS."));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint de Salud (Health Check)
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    servicio: "API Farmacia San Rafael",
    timestamp: new Date().toISOString(),
  });
});

// Enrutamiento modular
app.use("/api/usuarios", usuariosRoutes);
app.use("/api/inventario", inventarioRoutes);
app.use("/api/facturacion", facturacionRoutes);
app.use("/api/reportes", reportesRoutes);

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.url} no encontrada en esta API.`,
  });
});

// Middleware centralizado de errores
app.use(errorHandler);

export default app;
