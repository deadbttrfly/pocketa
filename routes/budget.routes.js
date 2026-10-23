const express = require("express");

const {
    getBudgets,
    getBudget,
    create,
    update,
    remove,
} = require("../controllers/budget.controller");

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getBudgets);
router.get("/:id", getBudget);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;