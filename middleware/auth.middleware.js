const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    const token = parts[1];
    const jwtSecret = process.env.JWT_SECRET;

    if (typeof jwtSecret !== "string" || !jwtSecret.trim()) {
      console.error("JWT_SECRET is missing or invalid");

      return res.status(500).json({
        success: false,
        message: "Authentication service is not configured",
      });
    }

    const decoded = jwt.verify(token, jwtSecret, {
      algorithms: ["HS256"],
    });

    if (
      !decoded ||
      !Number.isSafeInteger(decoded.userId) ||
      decoded.userId <= 0
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = {
      id: decoded.userId,
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
}

module.exports = authenticateToken;
