const express = require("express");
const db = require("../config/db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

// Ruta para que los administradores vean todas las órdenes
router.get("/admin", verifyToken, isAdmin, async (req, res) => {
  const query = `
    SELECT 
      o.id AS order_id, 
      u.username AS user_name,
      u.email AS user_email,
      o.total, 
      o.status, 
      o.created_at, 
      o.payment_method,
      o.address_id,
      a.street AS address_street,
      a.city AS address_city,
      a.zone AS address_zone,
      a.postal_code AS address_postal_code,
      od.product_id,
      od.quantity,
      od.price AS product_price,
      p.name AS product_name,
      p.description AS product_description,
      p.image_url AS product_image
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    LEFT JOIN addresses a ON o.address_id = a.id
    LEFT JOIN order_details od ON o.id = od.order_id
    LEFT JOIN products p ON od.product_id = p.id
    ORDER BY o.created_at DESC
  `;

  try {
    const [results] = await db.query(query);

    // Agrupar los resultados por orden
    const orders = results.reduce((acc, row) => {
      const order = acc.find((o) => o.order_id === row.order_id);
      const product = {
        product_id: row.product_id,
        product_name: row.product_name,
        product_description: row.product_description,
        product_image: row.product_image,
        quantity: row.quantity,
        product_price: row.product_price,
      };

      if (order) {
        if (row.product_id) {
          order.products.push(product);
        }
      } else {
        acc.push({
          order_id: row.order_id,
          user_name: row.user_name,
          user_email: row.user_email,
          total: row.total,
          status: row.status,
          created_at: row.created_at,
          payment_method: row.payment_method,
          address: {
            street: row.address_street,
            city: row.address_city,
            zone: row.address_zone,
            postal_code: row.address_postal_code,
          },
          products: row.product_id ? [product] : [],
        });
      }

      return acc;
    }, []);

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para actualizar el estado de una orden
router.put("/:orderId", verifyToken, isAdmin, async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    await db.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      orderId,
    ]);
    res.json({ message: "Estado de la orden actualizado con éxito" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
