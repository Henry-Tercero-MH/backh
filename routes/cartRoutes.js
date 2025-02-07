const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");
const { sendNotification } = require("../config/mailer");

const router = express.Router();

// Agregar un producto al carrito
router.post("/add", verifyToken, (req, res) => {
  const { product_id, quantity } = req.body;

  db.query(
    "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?",
    [req.user.id, product_id, quantity, quantity],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Producto agregado al carrito" });
    }
  );
});

// Ver el carrito del usuario
router.get("/", verifyToken, (req, res) => {
  db.query(
    `SELECT c.id, p.name, p.price, c.quantity, p.image_url FROM cart c 
         JOIN products p ON c.product_id = p.id WHERE c.user_id = ?`,
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// Eliminar un producto del carrito
router.delete("/:product_id", verifyToken, (req, res) => {
  const { product_id } = req.params;

  db.query(
    "DELETE FROM cart WHERE user_id = ? AND product_id = ?",
    [req.user.id, product_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(200).json({ message: "Producto eliminado del carrito" });
    }
  );
});

// Checkout del carrito
router.post("/checkout", verifyToken, (req, res) => {
  const { address_id, paymentMethod } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(
      `SELECT p.id, p.price, p.stock, c.quantity 
       FROM cart c 
       JOIN products p ON c.product_id = p.id 
       WHERE c.user_id = ?`,
      [req.user.id],
      (err, products) => {
        if (err) {
          db.rollback(() => res.status(500).json({ error: err.message }));
          return;
        }

        const outOfStock = products.some((p) => p.quantity > p.stock);
        if (outOfStock) {
          db.rollback(() =>
            res
              .status(400)
              .json({ error: "Stock insuficiente para uno o más productos" })
          );
          return;
        }

        db.query(
          `INSERT INTO orders (user_id, address_id, total, payment_method) 
           SELECT ?, ?, SUM(p.price * c.quantity), ? 
           FROM cart c 
           JOIN products p ON c.product_id = p.id 
           WHERE c.user_id = ?`,
          [req.user.id, address_id, paymentMethod, req.user.id],
          (err, result) => {
            if (err) {
              db.rollback(() => res.status(500).json({ error: err.message }));
              return;
            }

            const orderId = result.insertId;

            const updateStockQueries = products.map(
              (p) =>
                new Promise((resolve, reject) => {
                  db.query(
                    "UPDATE products SET stock = stock - ? WHERE id = ?",
                    [p.quantity, p.id],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                })
            );

            const insertOrderDetailsQueries = products.map(
              (p) =>
                new Promise((resolve, reject) => {
                  db.query(
                    "INSERT INTO order_details (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
                    [orderId, p.id, p.quantity, p.price],
                    (err) => {
                      if (err) reject(err);
                      else resolve();
                    }
                  );
                })
            );

            Promise.all([...updateStockQueries, ...insertOrderDetailsQueries])
              .then(() => {
                db.query(
                  "DELETE FROM cart WHERE user_id = ?",
                  [req.user.id],
                  (err) => {
                    if (err) {
                      db.rollback(() =>
                        res.status(500).json({ error: err.message })
                      );
                      return;
                    }

                    db.commit((err) => {
                      if (err) {
                        db.rollback(() =>
                          res.status(500).json({ error: err.message })
                        );
                        return;
                      }

                      // Enviar notificación al usuario
                      (async () => {
                        try {
                          await sendNotification(
                            req.user.email,
                            "Compra realizada con éxito",
                            `Tu compra ha sido procesada con éxito. El número de la orden es ${orderId}.`
                          );
                        } catch (err) {
                          console.error("Error al enviar notificación:", err);
                        }
                      })();

                      res.json({
                        message: "Compra realizada con éxito",
                        orderId,
                      });
                    });
                  }
                );
              })
              .catch((err) => {
                db.rollback(() => res.status(500).json({ error: err.message }));
              });
          }
        );
      }
    );
  });
});

module.exports = router;
