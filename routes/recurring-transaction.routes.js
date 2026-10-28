const express = require("express");
const router = express.Router();
const recurringTransactionController = require("../controllers/recurring-transaction.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get(
  "/",
  authMiddleware,
  recurringTransactionController.getAllRecurringTransactions,
);

router.post(
  "/",
  authMiddleware,
  recurringTransactionController.createRecurringTransaction,
);

router.post(
  "/process",
  authMiddleware,
  recurringTransactionController.processRecurringTransactions,
);

router.patch(
  "/:id/status",
  authMiddleware,
  recurringTransactionController.updateRecurringTransactionStatus,
);

router.get(
  "/:id",
  authMiddleware,
  recurringTransactionController.getRecurringTransactionById,
);

router.put(
  "/:id",
  authMiddleware,
  recurringTransactionController.updateRecurringTransaction,
);

router.delete(
  "/:id",
  authMiddleware,
  recurringTransactionController.deleteRecurringTransaction,
);

module.exports = router;
