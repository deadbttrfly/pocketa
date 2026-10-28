const {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
} = require("../services/budget.service");

function isValidId(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

function isValidPositiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function isValidDate(date) {
  if (typeof date !== "string") {
    return false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(date)) {
    return false;
  }

  const dateObject = new Date(`${date}T00:00:00`);

  if (Number.isNaN(dateObject.getTime())) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  return (
    dateObject.getFullYear() === year &&
    dateObject.getMonth() + 1 === month &&
    dateObject.getDate() === day
  );
}

async function getBudgets(req, res) {
  try {
    const userId = req.user.id;

    const budgets = await getAllBudgets(userId);

    return res.status(200).json({
      success: true,
      data: budgets,
    });
  } catch (error) {
    console.error("Get budgets error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getBudget(req, res) {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;

    if (!isValidId(budgetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const budget = await getBudgetById(userId, budgetId);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    console.error("Get budget error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function create(req, res) {
  try {
    const userId = req.user.id;

    const { category_id, amount, start_date, end_date } = req.body;

    if (
      category_id === undefined ||
      amount === undefined ||
      start_date === undefined ||
      end_date === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Category, amount, start date, and end date are required",
      });
    }

    if (!isValidPositiveInteger(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Category ID must be a positive integer",
      });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a number greater than 0",
      });
    }

    if (!isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date. Use YYYY-MM-DD",
      });
    }

    if (!isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid end date. Use YYYY-MM-DD",
      });
    }

    if (start_date > end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be greater than end date",
      });
    }

    const budget = await createBudget(
      userId,
      category_id,
      amount,
      start_date,
      end_date,
    );

    return res.status(201).json({
      success: true,
      message: "Budget created successfully",
      data: budget,
    });
  } catch (error) {
    console.error("Create budget error:", error);

    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (error.message === "CATEGORY_NOT_EXPENSE") {
      return res.status(400).json({
        success: false,
        message: "Budget category must be an expense category",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function update(req, res) {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;

    if (!isValidId(budgetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const { category_id, amount, start_date, end_date } = req.body;

    if (
      category_id === undefined ||
      amount === undefined ||
      start_date === undefined ||
      end_date === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Category, amount, start date, and end date are required",
      });
    }

    if (!isValidPositiveInteger(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Category ID must be a positive integer",
      });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a number greater than 0",
      });
    }

    if (!isValidDate(start_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid start date. Use YYYY-MM-DD",
      });
    }

    if (!isValidDate(end_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid end date. Use YYYY-MM-DD",
      });
    }

    if (start_date > end_date) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be greater than end date",
      });
    }

    const budget = await updateBudget(
      userId,
      budgetId,
      category_id,
      amount,
      start_date,
      end_date,
    );

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget updated successfully",
      data: budget,
    });
  } catch (error) {
    console.error("Update budget error:", error);

    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (error.message === "CATEGORY_NOT_EXPENSE") {
      return res.status(400).json({
        success: false,
        message: "Budget category must be an expense category",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function remove(req, res) {
  try {
    const userId = req.user.id;
    const budgetId = req.params.id;

    if (!isValidId(budgetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid budget ID",
      });
    }

    const deleted = await deleteBudget(userId, budgetId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    console.error("Delete budget error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getBudgets,
  getBudget,
  create,
  update,
  remove,
};
