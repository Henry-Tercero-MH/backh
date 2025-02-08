const express = require("express");
const db = require("../config/db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Ruta para obtener los detalles de una orden por su ID
router.get("/:orderId", verifyToken, isAdmin, async (req, res) => {
  const { orderId } = req.params;

  const query = `
    SELECT 
      od.id AS order_detail_id,
      od.order_id,
      od.product_id,
      od.quantity,
      od.price,
      p.name AS product_name,
      p.description AS product_description,
      p.image_url AS product_image
    FROM order_details od
    JOIN products p ON od.product_id = p.id
    WHERE od.order_id = ?
  `;

  try {
    const [results] = await db.query(query, [orderId]);
    if (results.length === 0) {
      return res
        .status(404)
        .json({ message: "Detalles de la orden no encontrados" });
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
