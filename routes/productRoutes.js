const express = require("express");
const db = require("../config/db");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// Obtener todos los productos (cualquiera puede ver)
router.get("/", async (req, res) => {
  try {
    const [results] = await db.query("SELECT * FROM products");
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un producto por su ID (cualquiera puede ver)
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [results] = await db.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);
    if (results.length === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(results[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agregar un producto (solo admin)
router.post(
  "/",
  verifyToken,
  isAdmin,
  upload.fields([{ name: "image" }, { name: "image_back" }]),
  async (req, res) => {
    const { name, description, price, stock, category_name } = req.body;
    const image_url = req.files.image
      ? `/uploads/${req.files.image[0].filename}`
      : null;
    const image_url_back = req.files.image_back
      ? `/uploads/${req.files.image_back[0].filename}`
      : null;

    try {
      await db.query(
        "INSERT INTO products (name, description, price, stock, image_url, image_url_back, category_name) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          name,
          description,
          price,
          stock,
          image_url,
          image_url_back,
          category_name,
        ]
      );
      res.status(201).json({ message: "Producto agregado con éxito" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
