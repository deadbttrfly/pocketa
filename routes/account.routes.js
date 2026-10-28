const express = require("express");

const {
  getAccounts,
  getAccount,
  create,
  update,
  remove,
} = require("../controllers/account.controller");

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", getAccounts);
router.get("/:id", getAccount);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", remove);

module.exports = router;
