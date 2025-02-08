const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");
const logger = require("../config/logger");
const { sendNotification } = require("../config/mailer");

const router = express.Router();

// Agregar un producto al carrito
router.post("/add", verifyToken, async (req, res) => {
  const { product_id, quantity } = req.body;

  try {
    await db.query(
      "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
      [req.user.id, product_id, quantity, quantity]
    );
    res.status(201).json({ message: "Producto agregado al carrito" });
  } catch (err) {
    logger.error("Error al agregar producto al carrito:", err);
    res.status(500).json({ error: err.message });
  }
});

// Ver el carrito del usuario
router.get("/", verifyToken, async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT c.id, p.name, p.price, c.quantity, p.image_url FROM cart c 
       JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
      [req.user.id]
    );
    res.json(results);
  } catch (err) {
    logger.error("Error al obtener el carrito:", err);
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un producto del carrito
router.delete("/remove/:product_id", verifyToken, async (req, res) => {
  const { product_id } = req.params;

  try {
    await db.query("DELETE FROM cart WHERE user_id = ? AND product_id = ?", [
      req.user.id,
      product_id,
    ]);
    res.status(200).json({ message: "Producto eliminado del carrito" });
  } catch (err) {
    logger.error("Error al eliminar producto del carrito:", err);
    res.status(500).json({ error: err.message });
  }
});

// Checkout del carrito
router.post("/checkout", verifyToken, async (req, res) => {
  const { address_id, paymentMethod } = req.body;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      `SELECT p.id, p.price, p.stock, c.quantity 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [req.user.id]
    );

    const outOfStock = products.some((p) => p.quantity > p.stock);
    if (outOfStock) {
      await connection.rollback();
      return res
        .status(400)
        .json({ error: "Stock insuficiente para uno o más productos" });
    }

    const [result] = await connection.query(
      `INSERT INTO orders (user_id, address_id, total, payment_method) 
       SELECT ?, ?, SUM(p.price * c.quantity), ? 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [req.user.id, address_id, paymentMethod, req.user.id]
    );

    const orderId = result.insertId;

    const updateStockQueries = products.map((p) =>
      connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [
        p.quantity,
        p.id,
      ])
    );

    const insertOrderDetailsQueries = products.map((p) =>
      connection.query(
        "INSERT INTO order_details (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, p.id, p.quantity, p.price]
      )
    );

    await Promise.all([...updateStockQueries, ...insertOrderDetailsQueries]);

    await connection.query("DELETE FROM cart WHERE user_id = ?", [req.user.id]);

    await connection.commit();

    // Enviar notificación al usuario
    try {
      await sendNotification(
        req.user.email,
        "Compra realizada con éxito",
        `Tu compra ha sido procesada con éxito. El número de la orden es ${orderId}.`
      );
    } catch (err) {
      logger.error("Error al enviar notificación:", err);
    }

    res.json({
      message: "Compra realizada con éxito",
      orderId,
    });
  } catch (err) {
    await connection.rollback();
    logger.error("Error durante el checkout:", err);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
