const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// Registro de usuario
router.post("/register", async (req, res) => {
  const { name, email, password, role_name } = req.body;

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Obtener el ID del rol
  db.query(
    "SELECT id FROM roles WHERE role_name = ?",
    [role_name || "cliente"],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0) {
        return res.status(400).json({ error: "Rol no encontrado" });
      }

      const role_id = results[0].id;

      db.query(
        "INSERT INTO users (name, email, password, role_id) VALUES (?, ?, ?, ?)",
        [name, email, hashedPassword, role_id],
        (err, result) => {
          if (err) return res.status(500).json({ error: err.message });
          res.status(201).json({ message: "Usuario registrado con éxito" });
        }
      );
    }
  );
});

// Inicio de sesión
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if (results.length === 0)
        return res.status(401).json({ error: "Usuario no encontrado" });

      const user = results[0];

      // Verificar contraseña
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(401).json({ error: "Contraseña incorrecta" });

      // Generar token
      const token = jwt.sign(
        { id: user.id, role: user.role_name },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.json({
        token,
        user: { id: user.id, name: user.name, role: user.role_name },
      });
    }
  );
});

module.exports = router;
