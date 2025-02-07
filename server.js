require("dotenv").config(); // Cargar variables de entorno
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const path = require("path");
const logger = require("./config/logger");

const app = express();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// Middleware de seguridad
app.use(helmet()); // Protege contra vulnerabilidades comunes
app.use(cors({ origin: "*" })); // Permite solicitudes desde cualquier dominio (puedes restringirlo)
app.use(express.json()); // Habilita JSON en el body

// Limitar número de peticiones
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 solicitudes por IP
  message: "Demasiadas solicitudes, intenta más tarde",
});

app.use(limiter);

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

const userRoutes = require("./routes/userRoutes");
app.use("/api/users", userRoutes);

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

const cartRoutes = require("./routes/cartRoutes");
app.use("/api/cart", cartRoutes);

const orderDetailsRoutes = require("./routes/orderDetails");
app.use("/api/orderDetails", orderDetailsRoutes);

const addressRoutes = require("./routes/addressRoutes");
app.use("/api/address", addressRoutes);

// Servir archivos estáticos desde la carpeta 'uploads'
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const ordersRoutes = require("./routes/ordersRoutes");
app.use("/api/orders", ordersRoutes);

const salesRoutes = require("./routes/salesRoutes");
app.use("/api/sales", salesRoutes);

// Capturar errores globales
app.use((err, req, res, next) => {
  logger.error(err.message);
  res.status(500).json({ error: "Error interno del servidor" });
});

// Puerto del servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
