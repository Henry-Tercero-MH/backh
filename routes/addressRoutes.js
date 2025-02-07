const express = require("express");
const db = require("../config/db");
const { verifyToken } = require("../middleware/authMiddleware");

const router = express.Router();

// Agregar una nueva dirección
router.post("/add", verifyToken, (req, res) => {
  const { street, city, zone, zip_code, postal_code } = req.body;

  db.query(
    "INSERT INTO addresses (user_id, street, city, zone, zip_code, postal_code) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, street, city, zone, zip_code, postal_code],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({
        message: "Dirección agregada con éxito",
        addressId: result.insertId,
      });
    }
  );
});

module.exports = router;