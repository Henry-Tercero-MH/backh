const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Acceso denegado" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Acceso denegado" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Token inválido" });

    req.user = decoded; // Agrega el usuario a la request
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "No tienes permisos de administrador" });
  }
  next();
};

module.exports = { verifyToken, isAdmin };
