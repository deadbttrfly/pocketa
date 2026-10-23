const db = require("../config/db");

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function getTodayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function calculateNextOccurrence(
  currentDate,
  frequency,
  anchorDate = currentDate,
) {
  const [year, month, day] = currentDate.split("-").map(Number);
  const [, anchorMonth, anchorDay] = anchorDate.split("-").map(Number);

  switch (frequency) {
    case "daily": {
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCDate(date.getUTCDate() + 1);

      return date.toISOString().slice(0, 10);
    }

    case "weekly": {
      const date = new Date(Date.UTC(year, month - 1, day));
      date.setUTCDate(date.getUTCDate() + 7);

      return date.toISOString().slice(0, 10);
    }

    case "monthly": {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;

      const lastDayOfTargetMonth = new Date(
        Date.UTC(nextYear, nextMonth, 0),
      ).getUTCDate();

      const nextDay = Math.min(anchorDay, lastDayOfTargetMonth);

      return [
        nextYear,
        String(nextMonth).padStart(2, "0"),
        String(nextDay).padStart(2, "0"),
      ].join("-");
    }

    case "yearly": {
      const nextYear = year + 1;

      const lastDayOfTargetMonth = new Date(
        Date.UTC(nextYear, anchorMonth, 0),
      ).getUTCDate();

      const nextDay = Math.min(anchorDay, lastDayOfTargetMonth);

      return [
        nextYear,
        String(anchorMonth).padStart(2, "0"),
        String(nextDay).padStart(2, "0"),
      ].join("-");
    }

    default:
      throw new Error("Invalid frequency");
  }
}

function formatDate(date) {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }

  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }

  throw new Error("Invalid date value");
}

function isValidDate(dateString) {
  if (typeof dateString !== "string") {
    return false;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function validateRecurringInput(data) {
  const {
    account_id,
    category_id,
    type,
    amount,
    description,
    frequency,
    start_date,
    end_date,
  } = data;

  const errors = [];

  if (account_id === undefined || account_id === null) {
    errors.push("account_id is required");
  } else if (!Number.isInteger(account_id) || account_id <= 0) {
    errors.push("account_id must be a positive integer");
  }

  if (category_id === undefined || category_id === null) {
    errors.push("category_id is required");
  } else if (!Number.isInteger(category_id) || category_id <= 0) {
    errors.push("category_id must be a positive integer");
  }

  if (type === undefined || type === null) {
    errors.push("type is required");
  } else if (typeof type !== "string") {
    errors.push("type must be a string");
  } else if (!["income", "expense"].includes(type.trim().toLowerCase())) {
    errors.push("type must be income or expense");
  }

  if (amount === undefined || amount === null) {
    errors.push("amount is required");
  } else if (
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    errors.push("amount must be a number greater than 0");
  }

  if (frequency === undefined || frequency === null) {
    errors.push("frequency is required");
  } else if (typeof frequency !== "string") {
    errors.push("frequency must be a string");
  } else if (
    !["daily", "weekly", "monthly", "yearly"].includes(
      frequency.trim().toLowerCase(),
    )
  ) {
    errors.push("frequency must be daily, weekly, monthly, or yearly");
  }

  if (start_date === undefined || start_date === null || start_date === "") {
    errors.push("start_date is required");
  } else if (!isValidDate(start_date)) {
    errors.push("start_date must be a valid date in YYYY-MM-DD format");
  }

  if (end_date !== undefined && end_date !== null && end_date !== "") {
    if (!isValidDate(end_date)) {
      errors.push("end_date must be a valid date in YYYY-MM-DD format");
    } else if (isValidDate(start_date) && end_date < start_date) {
      errors.push("end_date must be greater than or equal to start_date");
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      errors.push("description must be a string");
    } else if (description.length > 255) {
      errors.push("description must not exceed 255 characters");
    }
  }

  return errors;
}

async function getAllRecurringTransactions(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        account_id,
        category_id,
        type,
        amount,
        description,
        frequency,
        start_date,
        end_date,
        next_occurrence,
        is_active
      FROM recurring_transactions
      WHERE user_id = ?
      ORDER BY next_occurrence ASC, id ASC
    `,
    [userId],
  );

  return rows;
}

async function getRecurringTransactionById(id, userId) {
  const [rows] = await db.execute(
    `
      SELECT
        id,
        account_id,
        category_id,
        type,
        amount,
        description,
        frequency,
        start_date,
        end_date,
        next_occurrence,
        is_active
      FROM recurring_transactions
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [id, userId],
  );

  return rows[0] || null;
}

async function createRecurringTransaction(userId, data) {
  const errors = validateRecurringInput(data);

  if (errors.length > 0) {
    const error = new Error(errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  const {
    account_id,
    category_id,
    type,
    amount,
    description,
    frequency,
    start_date,
    end_date,
  } = data;

  const [accounts] = await db.execute(
    `
      SELECT id, is_active
      FROM accounts
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [account_id, userId],
  );

  if (accounts.length === 0) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  if (!accounts[0].is_active) {
    const error = new Error(
      "Cannot create recurring transaction using inactive account",
    );
    error.statusCode = 400;
    throw error;
  }

  const [categories] = await db.execute(
    `
      SELECT id, type
      FROM categories
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [category_id, userId],
  );

  if (categories.length === 0) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  if (categories[0].type !== type) {
    const error = new Error(
      "Category type must match recurring transaction type",
    );
    error.statusCode = 400;
    throw error;
  }

  const nextOccurrence = start_date;

  const [result] = await db.execute(
    `
      INSERT INTO recurring_transactions (
        user_id,
        account_id,
        category_id,
        type,
        amount,
        description,
        frequency,
        start_date,
        end_date,
        next_occurrence,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      userId,
      account_id,
      category_id,
      type,
      amount,
      description || null,
      frequency,
      start_date,
      end_date || null,
      nextOccurrence,
      true,
    ],
  );

  return getRecurringTransactionById(result.insertId, userId);
}

async function updateRecurringTransaction(userId, id, data) {
  const errors = validateRecurringInput(data);

  if (errors.length > 0) {
    const error = new Error(errors.join(", "));
    error.statusCode = 400;
    throw error;
  }

  const {
    account_id,
    category_id,
    type,
    amount,
    description,
    frequency,
    start_date,
    end_date,
  } = data;

  const [recurringRows] = await db.execute(
    `
      SELECT
        id,
        frequency AS current_frequency,
        start_date AS current_start_date,
        end_date AS current_end_date,
        next_occurrence
      FROM recurring_transactions
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [id, userId],
  );

  if (recurringRows.length === 0) {
    const error = new Error("Recurring transaction not found");
    error.statusCode = 404;
    throw error;
  }

  const currentRecurring = recurringRows[0];

  const [accounts] = await db.execute(
    `
      SELECT id, is_active
      FROM accounts
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [account_id, userId],
  );

  if (accounts.length === 0) {
    const error = new Error("Account not found");
    error.statusCode = 404;
    throw error;
  }

  if (!accounts[0].is_active) {
    const error = new Error(
      "Cannot update recurring transaction using inactive account",
    );
    error.statusCode = 400;
    throw error;
  }

  const [categories] = await db.execute(
    `
      SELECT id, type
      FROM categories
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [category_id, userId],
  );

  if (categories.length === 0) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  if (categories[0].type !== type) {
    const error = new Error(
      "Category type must match recurring transaction type",
    );
    error.statusCode = 400;
    throw error;
  }

  const scheduleChanged =
    currentRecurring.current_frequency !== frequency ||
    formatDate(currentRecurring.current_start_date) !== start_date ||
    (currentRecurring.current_end_date
      ? formatDate(currentRecurring.current_end_date)
      : "") !== (end_date || "");

  const nextOccurrence = scheduleChanged
    ? start_date
    : formatDate(currentRecurring.next_occurrence);

  const isActive = end_date && nextOccurrence > end_date ? false : true;

  await db.execute(
    `
      UPDATE recurring_transactions
      SET
        account_id = ?,
        category_id = ?,
        type = ?,
        amount = ?,
        description = ?,
        frequency = ?,
        start_date = ?,
        end_date = ?,
        next_occurrence = ?,
        is_active = ?
      WHERE id = ?
        AND user_id = ?
    `,
    [
      account_id,
      category_id,
      type,
      amount,
      description || null,
      frequency,
      start_date,
      end_date || null,
      nextOccurrence,
      isActive,
      id,
      userId,
    ],
  );

  return getRecurringTransactionById(id, userId);
}

async function deleteRecurringTransaction(userId, id) {
  const [rows] = await db.execute(
    `
      SELECT id
      FROM recurring_transactions
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [id, userId],
  );

  if (rows.length === 0) {
    const error = new Error("Recurring transaction not found");
    error.statusCode = 404;
    throw error;
  }

  await db.execute(
    `
      DELETE FROM recurring_transactions
      WHERE id = ?
        AND user_id = ?
    `,
    [id, userId],
  );

  return true;
}

async function updateRecurringTransactionStatus(userId, id, isActive) {
  if (typeof isActive !== "boolean") {
    const error = new Error("is_active must be a boolean");
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await db.execute(
    `
      SELECT id, is_active
      FROM recurring_transactions
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [id, userId],
  );

  if (rows.length === 0) {
    const error = new Error("Recurring transaction not found");
    error.statusCode = 404;
    throw error;
  }

  await db.execute(
    `
      UPDATE recurring_transactions
      SET is_active = ?
      WHERE id = ?
        AND user_id = ?
    `,
    [isActive, id, userId],
  );

  const [updatedRows] = await db.execute(
    `
      SELECT id, is_active
      FROM recurring_transactions
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [id, userId],
  );

  return updatedRows[0];
}

async function processRecurringTransactions(userId) {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const today = getTodayDate();

    const [recurringRows] = await connection.execute(
      `
        SELECT
          rt.id,
          rt.account_id,
          rt.category_id,
          rt.type,
          rt.amount,
          rt.description,
          rt.frequency,
          rt.start_date,
          rt.end_date,
          rt.next_occurrence,
          rt.is_active,
          a.is_active AS account_is_active
        FROM recurring_transactions rt
        INNER JOIN accounts a
          ON a.id = rt.account_id
          AND a.user_id = rt.user_id
        WHERE rt.user_id = ?
          AND rt.is_active = 1
          AND a.is_active = 1
          AND rt.next_occurrence <= ?
        ORDER BY rt.next_occurrence ASC, rt.id ASC
        FOR UPDATE
      `,
      [userId, today],
    );

    let processed = 0;
    let transactionsCreated = 0;
    const transactions = [];

    for (const recurring of recurringRows) {
      processed++;

      let currentOccurrence = formatDate(recurring.next_occurrence);

      while (currentOccurrence <= today) {
        if (
          recurring.end_date &&
          currentOccurrence > formatDate(recurring.end_date)
        ) {
          break;
        }

        const [existingTransactions] = await connection.execute(
          `
            SELECT id
            FROM transactions
            WHERE recurring_transaction_id = ?
              AND transaction_date = ?
            LIMIT 1
          `,
          [recurring.id, currentOccurrence],
        );

        if (existingTransactions.length === 0) {
          const [transactionResult] = await connection.execute(
            `
              INSERT INTO transactions (
                user_id,
                account_id,
                category_id,
                recurring_transaction_id,
                type,
                amount,
                description,
                transaction_date
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              userId,
              recurring.account_id,
              recurring.category_id,
              recurring.id,
              recurring.type,
              recurring.amount,
              recurring.description,
              currentOccurrence,
            ],
          );

          const transactionId = transactionResult.insertId;

          const balanceChange =
            recurring.type === "income"
              ? Number(recurring.amount)
              : -Number(recurring.amount);

          await connection.execute(
            `
              UPDATE accounts
              SET balance = balance + ?
              WHERE id = ?
                AND user_id = ?
            `,
            [balanceChange, recurring.account_id, userId],
          );

          transactionsCreated++;

          transactions.push({
            recurring_transaction_id: recurring.id,
            transaction_id: transactionId,
            transaction_date: currentOccurrence,
          });
        }

        currentOccurrence = calculateNextOccurrence(
          currentOccurrence,
          recurring.frequency,
          formatDate(recurring.start_date),
        );
      }

      const nextOccurrence = currentOccurrence;

      const shouldDeactivate =
        recurring.end_date && nextOccurrence > formatDate(recurring.end_date);

      await connection.execute(
        `
          UPDATE recurring_transactions
          SET
            next_occurrence = ?,
            is_active = ?
          WHERE id = ?
            AND user_id = ?
        `,
        [nextOccurrence, shouldDeactivate ? 0 : 1, recurring.id, userId],
      );
    }

    await connection.commit();

    return {
      processed,
      transactions_created: transactionsCreated,
      transactions,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }

    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getTodayDate,
  calculateNextOccurrence,
  validateRecurringInput,
  getAllRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  updateRecurringTransactionStatus,
  processRecurringTransactions,
};
