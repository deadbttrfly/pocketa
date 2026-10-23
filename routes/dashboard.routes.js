const express = require("express");

const {
    getDashboardData,
} = require("../controllers/dashboard.controller");

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getDashboardData);

module.exports = router;