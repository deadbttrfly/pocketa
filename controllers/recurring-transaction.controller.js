const recurringTransactionService = require("../services/recurring-transaction.service");
const notificationService = require("../services/notification.service");

function isValidId(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

async function getAllRecurringTransactions(req, res) {
  try {
    const userId = req.user.id;

    const data =
      await recurringTransactionService.getAllRecurringTransactions(userId);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get recurring transactions error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get recurring transactions",
    });
  }
}

async function getRecurringTransactionById(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recurring transaction ID",
      });
    }

    const data = await recurringTransactionService.getRecurringTransactionById(
      id,
      userId,
    );

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Recurring transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get recurring transaction detail error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get recurring transaction",
    });
  }
}

async function createRecurringTransaction(req, res) {
  try {
    const userId = req.user.id;

    const data = await recurringTransactionService.createRecurringTransaction(
      userId,
      req.body,
    );

    res.status(201).json({
      success: true,
      message: "Recurring transaction created successfully",
      data,
    });
  } catch (error) {
    console.error("Create recurring transaction error:", error);

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Failed to create recurring transaction"
          : error.message,
    });
  }
}

async function updateRecurringTransaction(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recurring transaction ID",
      });
    }

    const data = await recurringTransactionService.updateRecurringTransaction(
      userId,
      id,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Recurring transaction updated successfully",
      data,
    });
  } catch (error) {
    console.error("Update recurring transaction error:", error);

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Failed to update recurring transaction"
          : error.message,
    });
  }
}

async function deleteRecurringTransaction(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recurring transaction ID",
      });
    }

    await recurringTransactionService.deleteRecurringTransaction(userId, id);

    res.status(200).json({
      success: true,
      message: "Recurring transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete recurring transaction error:", error);

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Failed to delete recurring transaction"
          : error.message,
    });
  }
}

async function updateRecurringTransactionStatus(req, res) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recurring transaction ID",
      });
    }

    const { is_active } = req.body;

    const data =
      await recurringTransactionService.updateRecurringTransactionStatus(
        userId,
        id,
        is_active,
      );

    const message = is_active
      ? "Recurring transaction activated successfully"
      : "Recurring transaction deactivated successfully";

    res.status(200).json({
      success: true,
      message,
      data,
    });
  } catch (error) {
    console.error("Update recurring transaction status error:", error);

    const statusCode = error.statusCode || 500;

    res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Failed to update recurring transaction status"
          : error.message,
    });
  }
}

async function processRecurringTransactions(req, res) {
  const userId = req.user.id;

  const jakartaDate = () =>
    new Date().toLocaleDateString("sv-SE", {
      timeZone: "Asia/Jakarta",
    });

  try {
    const data =
      await recurringTransactionService.processRecurringTransactions(userId);

    // Buat notifikasi hanya untuk transaksi yang benar-benar
    // berhasil dibuat oleh service, bukan yang dilewati karena duplikat.
    for (const transaction of data.transactions || []) {
      try {
        await notificationService.createNotification({
          userId,
          type: "recurring_success",
          title: "Transaksi berulang berhasil diproses",
          message:
            `Transaksi untuk jadwal #${transaction.recurring_transaction_id} ` +
            `berhasil dibuat pada ${transaction.transaction_date}.`,
          link: "/transactions",
          dedupeKey: `recurring-success:${transaction.recurring_transaction_id}:${transaction.transaction_date}`,
        });
      } catch (notificationError) {
        console.error(
          "Create recurring success notification error:",
          notificationError,
        );
      }
    }

    return res.status(200).json({
      success: true,
      message: "Recurring transactions processed successfully",
      data,
    });
  } catch (error) {
    console.error("Process recurring transactions error:", error);

    // Kegagalan notifikasi tidak boleh menutupi error asli.
    try {
      await notificationService.createNotification({
        userId,
        type: "recurring_failure",
        title: "Pemrosesan transaksi berulang gagal",
        message:
          "Pocketa gagal memproses transaksi berulang. " +
          "Periksa akun dan jadwal recurring, lalu coba kembali.",
        link: "/recurring",
        dedupeKey: `recurring-failure:${jakartaDate()}`,
      });
    } catch (notificationError) {
      console.error(
        "Create recurring failure notification error:",
        notificationError,
      );
    }

    const statusCode = error.statusCode || 500;

    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Failed to process recurring transactions"
          : error.message,
    });
  }
}

module.exports = {
  getAllRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransactionStatus,
  processRecurringTransactions,
};
