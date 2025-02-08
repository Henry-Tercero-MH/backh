const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

// Registro de usuario
router.post("/register", async (req, res) => {
  const { username, email, password, role_name } = req.body;

  try {
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Obtener el ID del rol
    const [roleResults] = await db.query(
      "SELECT id FROM roles WHERE role_name = ?",
      [role_name || "cliente"]
    );

    if (roleResults.length === 0) {
      return res.status(400).json({ error: "Rol no encontrado" });
    }

    const role_id = roleResults[0].id;

    // Insertar nuevo usuario
    await db.query(
      "INSERT INTO users (username, email, password, role_id) VALUES (?, ?, ?, ?)",
      [username, email, hashedPassword, role_id]
    );

    res.status(201).json({ message: "Usuario registrado con éxito" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login de usuario
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [userResults] = await db.query(
      "SELECT u.*, r.role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE email = ?",
      [email]
    );

    if (userResults.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    const user = userResults[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role_name },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role_name },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
