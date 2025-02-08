const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Agregar una nueva dirección
router.post("/add", verifyToken, async (req, res) => {
  const { street, city, zone, postal_code } = req.body;

  try {
    const [result] = await db.query(
      "INSERT INTO addresses (user_id, street, city, zone, postal_code) VALUES (?, ?, ?, ?, ?)",
      [req.user.id, street, city, zone, postal_code]
    );
    res.status(201).json({
      message: "Dirección agregada con éxito",
      addressId: result.insertId,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
