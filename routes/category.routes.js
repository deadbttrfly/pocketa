const express = require("express");

const {
    getCategories,
    getCategory,
    create,
    update,
    remove,
} = require("../controllers/category.controller");

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getCategories);
router.get("/:id", getCategory);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;