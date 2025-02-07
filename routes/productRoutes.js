const express = require("express");
const db = require("../config/db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Obtener todos los productos (cualquiera puede ver)
router.get("/", (req, res) => {
  db.query("SELECT * FROM products", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});
// Obtener un producto por su ID (cualquiera puede ver)
router.get("/:id", (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM products WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ message: "Producto no encontrado" });
    res.json(results[0]);
  });
});
// Agregar un producto (solo admin)
router.post("/", verifyToken, isAdmin, upload.single("image"), (req, res) => {
  const { name, description, price, stock } = req.body;
  const image_url = req.file ? `/uploads/${req.file.filename}` : null;

  db.query(
    "INSERT INTO products (name, description, price, stock, image_url) VALUES (?, ?, ?, ?, ?)",
    [name, description, price, stock, image_url],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ message: "Producto agregado con éxito" });
    }
  );
});

module.exports = router;
