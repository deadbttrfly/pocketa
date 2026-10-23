const {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} = require("../services/transaction.service");

const { validateRequiredString } = require("../utils/validation");

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

async function getTransactions(req, res) {
  try {
    const userId = req.user.id;

    const transactions = await getAllTransactions(userId);

    return res.status(200).json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getTransaction(req, res) {
  try {
    const userId = req.user.id;
    const transactionId = req.params.id;

    if (!isValidId(transactionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const transaction = await getTransactionById(userId, transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error("Get transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function create(req, res) {
  try {
    const userId = req.user.id;

    const {
      account_id,
      category_id,
      type,
      amount,
      description,
      transaction_date,
    } = req.body;

    if (
      account_id === undefined ||
      category_id === undefined ||
      type === undefined ||
      amount === undefined ||
      transaction_date === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Account, category, type, amount, and transaction date are required",
      });
    }

    if (!isValidPositiveInteger(account_id)) {
      return res.status(400).json({
        success: false,
        message: "Account ID must be a positive integer",
      });
    }

    if (!isValidPositiveInteger(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Category ID must be a positive integer",
      });
    }

    if (typeof type !== "string") {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be a string",
      });
    }

    const normalizedType = type.trim().toLowerCase();
    const allowedTypes = ["income", "expense"];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a number greater than 0",
      });
    }

    if (!isValidDate(transaction_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date. Use YYYY-MM-DD",
      });
    }

    if (description !== undefined && description !== null) {
      const descriptionError = validateRequiredString(
        description,
        "Description",
        255,
      );

      if (descriptionError) {
        return res.status(400).json({
          success: false,
          message: descriptionError,
        });
      }
    }

    const normalizedDescription =
      typeof description === "string" ? description.trim() : null;

    const transaction = await createTransaction(
      userId,
      account_id,
      category_id,
      normalizedType,
      amount,
      normalizedDescription,
      transaction_date,
    );

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error);

    if (error.message === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Account not found or inactive",
      });
    }

    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (error.message === "CATEGORY_TYPE_MISMATCH") {
      return res.status(400).json({
        success: false,
        message: "Transaction type does not match category type",
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
    const transactionId = req.params.id;

    if (!isValidId(transactionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const {
      account_id,
      category_id,
      type,
      amount,
      description,
      transaction_date,
    } = req.body;

    if (
      account_id === undefined ||
      category_id === undefined ||
      type === undefined ||
      amount === undefined ||
      transaction_date === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Account, category, type, amount, and transaction date are required",
      });
    }

    if (!isValidPositiveInteger(account_id)) {
      return res.status(400).json({
        success: false,
        message: "Account ID must be a positive integer",
      });
    }

    if (!isValidPositiveInteger(category_id)) {
      return res.status(400).json({
        success: false,
        message: "Category ID must be a positive integer",
      });
    }

    if (typeof type !== "string") {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be a string",
      });
    }

    const normalizedType = type.trim().toLowerCase();
    const allowedTypes = ["income", "expense"];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be a number greater than 0",
      });
    }

    if (!isValidDate(transaction_date)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction date. Use YYYY-MM-DD",
      });
    }

    if (description !== undefined && description !== null) {
      const descriptionError = validateRequiredString(
        description,
        "Description",
        255,
      );

      if (descriptionError) {
        return res.status(400).json({
          success: false,
          message: descriptionError,
        });
      }
    }

    const normalizedDescription =
      typeof description === "string" ? description.trim() : null;

    const transaction = await updateTransaction(
      userId,
      transactionId,
      account_id,
      category_id,
      normalizedType,
      amount,
      normalizedDescription,
      transaction_date,
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Update transaction error:", error);

    if (error.message === "ACCOUNT_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Account not found or inactive",
      });
    }

    if (error.message === "CATEGORY_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (error.message === "CATEGORY_TYPE_MISMATCH") {
      return res.status(400).json({
        success: false,
        message: "Transaction type does not match category type",
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
    const transactionId = req.params.id;

    if (!isValidId(transactionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction ID",
      });
    }

    const deleted = await deleteTransaction(userId, transactionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete transaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getTransactions,
  getTransaction,
  create,
  update,
  remove,
};
