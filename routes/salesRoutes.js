const express = require("express");
const db = require("../config/db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Ruta para que los administradores vean todas las ventas
router.get("/sales", verifyToken, isAdmin, async (req, res) => {
  try {
    const [results] = await db.query(
      "SELECT * FROM sales ORDER BY created_at DESC"
    );
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para obtener los productos más vendidos (disponible para el público)
router.get("/top-products", async (req, res) => {
  const query = `
    SELECT 
      p.id AS product_id, 
      p.name AS product_name, 
      p.description AS product_description, 
      p.image_url AS product_image, 
      SUM(od.quantity) AS total_sold 
    FROM order_details od
    JOIN products p ON od.product_id = p.id
    GROUP BY p.id, p.name, p.description, p.image_url
    ORDER BY total_sold DESC
    LIMIT 10
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
