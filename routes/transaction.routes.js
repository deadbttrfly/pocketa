const express = require("express");

const {
    getTransactions,
    getTransaction,
    create,
    update,
    remove,
} = require("../controllers/transaction.controller");

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getTransactions);
router.get("/:id", getTransaction);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;