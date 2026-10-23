const {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} = require("../services/account.service");

const { validateRequiredString } = require("../utils/validation");

const ALLOWED_TYPES = ["cash", "bank", "ewallet", "other"];
const MAX_BALANCE = 9999999999999.99;

function isValidId(id) {
  return (
    /^\d+$/.test(String(id)) &&
    Number.isSafeInteger(Number(id)) &&
    Number(id) > 0
  );
}

function validateBalance(balance) {
  if (typeof balance !== "number" && typeof balance !== "string") {
    return "Balance must be a valid number";
  }

  if (typeof balance === "string" && balance.trim() === "") {
    return "Balance must be a valid number";
  }

  const normalizedBalance = Number(balance);

  if (!Number.isFinite(normalizedBalance)) {
    return "Balance must be a valid number";
  }

  if (normalizedBalance < 0) {
    return "Balance cannot be negative";
  }

  if (normalizedBalance > MAX_BALANCE) {
    return "Balance exceeds the maximum allowed amount";
  }

  const cents = normalizedBalance * 100;

  if (Math.abs(cents - Math.round(cents)) > 1e-7) {
    return "Balance can have at most 2 decimal places";
  }

  return null;
}

async function getAccounts(req, res) {
  try {
    const userId = req.user.id;
    const includeInactive = req.query.include_inactive === "true";

    const accounts = await getAllAccounts(userId, includeInactive);

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error("Get accounts error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function getAccount(req, res) {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    if (!isValidId(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const account = await getAccountById(userId, accountId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error("Get account error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function create(req, res) {
  try {
    const userId = req.user.id;
    const { name, type, balance = 0 } = req.body;

    const nameError = validateRequiredString(name, "Name", 100);

    if (nameError) {
      return res.status(400).json({
        success: false,
        message: nameError,
      });
    }

    if (typeof type !== "string" || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    const normalizedName = name.trim();
    const normalizedType = type.trim().toLowerCase();

    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    const balanceError = validateBalance(balance);

    if (balanceError) {
      return res.status(400).json({
        success: false,
        message: balanceError,
      });
    }

    const normalizedBalance = Number(balance);

    const account = await createAccount(
      userId,
      normalizedName,
      normalizedType,
      normalizedBalance,
    );

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: account,
    });
  } catch (error) {
    console.error("Create account error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function update(req, res) {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;
    const { name, type } = req.body;

    if (!isValidId(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const nameError = validateRequiredString(name, "Name", 100);

    if (nameError) {
      return res.status(400).json({
        success: false,
        message: nameError,
      });
    }

    if (typeof type !== "string" || !type.trim()) {
      return res.status(400).json({
        success: false,
        message: "Type is required",
      });
    }

    const normalizedName = name.trim();
    const normalizedType = type.trim().toLowerCase();

    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    const account = await updateAccount(
      userId,
      accountId,
      normalizedName,
      normalizedType,
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account updated successfully",
      data: account,
    });
  } catch (error) {
    console.error("Update account error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function remove(req, res) {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    if (!isValidId(accountId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account ID",
      });
    }

    const deleted = await deleteAccount(userId, accountId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Account not found or already inactive",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getAccounts,
  getAccount,
  create,
  update,
  remove,
};
