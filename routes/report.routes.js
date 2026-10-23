const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const {
  getSummary,
  getIncomeExpense,
  getExpensesByCategory,
  getMonthlyTrend,
  getBudgetPerformance,
} = require("../controllers/report.controller");

router.get("/summary", authMiddleware, getSummary);

router.get("/income-expense", authMiddleware, getIncomeExpense);

router.get(
  "/expenses-by-category",
  authMiddleware,
  getExpensesByCategory
);

router.get("/monthly-trend", authMiddleware, getMonthlyTrend);

router.get(
  "/budget-performance",
  authMiddleware,
  getBudgetPerformance
);

module.exports = router;