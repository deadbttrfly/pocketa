const express = require("express");

const { register, login } = require("../controllers/auth.controller");

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authenticateToken, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Authenticated user",
    data: {
      userId: req.user.id,
    },
  });
});

module.exports = router;
