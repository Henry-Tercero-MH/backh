const express = require("express");
const db = require("../config/db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Ruta para que los administradores vean todas las ventas
router.get("/sales", verifyToken, isAdmin, (req, res) => {
  db.query("SELECT * FROM sales ORDER BY created_at DESC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Ruta para obtener los productos más vendidos
router.get("/top-products", verifyToken, isAdmin, (req, res) => {
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

  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
