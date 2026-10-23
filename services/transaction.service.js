const pool = require("../config/db");

async function getAllTransactions(userId) {
  const [rows] = await pool.query(
    `
        SELECT
            t.id,
            t.account_id,
            a.name AS account_name,
            t.category_id,
            c.name AS category_name,
            t.type,
            t.amount,
            t.description,
            t.transaction_date,
            t.created_at,
            t.updated_at
        FROM transactions t
        INNER JOIN accounts a
            ON t.account_id = a.id
        INNER JOIN categories c
            ON t.category_id = c.id
        WHERE t.user_id = ?
        ORDER BY
            t.transaction_date DESC,
            t.created_at DESC
        `,
    [userId],
  );

  return rows;
}

async function getTransactionById(userId, transactionId) {
  const [rows] = await pool.query(
    `
        SELECT
            t.id,
            t.account_id,
            a.name AS account_name,
            t.category_id,
            c.name AS category_name,
            t.type,
            t.amount,
            t.description,
            t.transaction_date,
            t.created_at,
            t.updated_at
        FROM transactions t
        INNER JOIN accounts a
            ON t.account_id = a.id
        INNER JOIN categories c
            ON t.category_id = c.id
        WHERE t.id = ?
        AND t.user_id = ?
        LIMIT 1
        `,
    [transactionId, userId],
  );

  return rows[0];
}

async function createTransaction(
  userId,
  accountId,
  categoryId,
  type,
  amount,
  description,
  transactionDate,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [accounts] = await connection.query(
      `
            SELECT
                id,
                balance,
                is_active
            FROM accounts
            WHERE id = ?
            AND user_id = ?
            FOR UPDATE
            `,
      [accountId, userId],
    );

    const account = accounts[0];

    if (!account || !account.is_active) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const [categories] = await connection.query(
      `
                SELECT
                    id,
                    type
                FROM categories
                WHERE id = ?
                AND user_id = ?
                LIMIT 1
                `,
      [categoryId, userId],
    );

    const category = categories[0];

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    if (category.type !== type) {
      throw new Error("CATEGORY_TYPE_MISMATCH");
    }

    const [result] = await connection.query(
      `
            INSERT INTO transactions
                (
                    user_id,
                    account_id,
                    category_id,
                    type,
                    amount,
                    description,
                    transaction_date
                )
            VALUES
                (?, ?, ?, ?, ?, ?, ?)
            `,
      [
        userId,
        accountId,
        categoryId,
        type,
        amount,
        description,
        transactionDate,
      ],
    );

    if (type === "income") {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance + ?
                WHERE id = ?
                AND user_id = ?
                `,
        [amount, accountId, userId],
      );
    } else {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance - ?
                WHERE id = ?
                AND user_id = ?
                `,
        [amount, accountId, userId],
      );
    }

    await connection.commit();

    return getTransactionById(userId, result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function updateTransaction(
  userId,
  transactionId,
  accountId,
  categoryId,
  type,
  amount,
  description,
  transactionDate,
) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [transactions] = await connection.query(
      `
                SELECT
                    id,
                    account_id,
                    category_id,
                    type,
                    amount
                FROM transactions
                WHERE id = ?
                AND user_id = ?
                FOR UPDATE
                `,
      [transactionId, userId],
    );

    const oldTransaction = transactions[0];

    if (!oldTransaction) {
      await connection.rollback();
      return null;
    }

    const [accounts] = await connection.query(
      `
            SELECT
                id,
                balance,
                is_active
            FROM accounts
            WHERE id = ?
            AND user_id = ?
            FOR UPDATE
            `,
      [accountId, userId],
    );

    const account = accounts[0];

    if (!account || !account.is_active) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (oldTransaction.account_id !== Number(accountId)) {
      await connection.query(
        `
                SELECT id, balance
                FROM accounts
                WHERE id = ?
                AND user_id = ?
                FOR UPDATE
                `,
        [oldTransaction.account_id, userId],
      );
    }

    const [categories] = await connection.query(
      `
                SELECT
                    id,
                    type
                FROM categories
                WHERE id = ?
                AND user_id = ?
                LIMIT 1
                `,
      [categoryId, userId],
    );

    const category = categories[0];

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    if (category.type !== type) {
      throw new Error("CATEGORY_TYPE_MISMATCH");
    }

    if (oldTransaction.type === "income") {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance - ?
                WHERE id = ?
                AND user_id = ?
                `,
        [oldTransaction.amount, oldTransaction.account_id, userId],
      );
    } else {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance + ?
                WHERE id = ?
                AND user_id = ?
                `,
        [oldTransaction.amount, oldTransaction.account_id, userId],
      );
    }

    if (type === "income") {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance + ?
                WHERE id = ?
                AND user_id = ?
                `,
        [amount, accountId, userId],
      );
    } else {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance - ?
                WHERE id = ?
                AND user_id = ?
                `,
        [amount, accountId, userId],
      );
    }

    await connection.query(
      `
            UPDATE transactions
            SET
                account_id = ?,
                category_id = ?,
                type = ?,
                amount = ?,
                description = ?,
                transaction_date = ?
            WHERE id = ?
            AND user_id = ?
            `,
      [
        accountId,
        categoryId,
        type,
        amount,
        description,
        transactionDate,
        transactionId,
        userId,
      ],
    );

    await connection.commit();

    return getTransactionById(userId, transactionId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function deleteTransaction(userId, transactionId) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [transactions] = await connection.query(
      `
                SELECT
                    id,
                    account_id,
                    type,
                    amount
                FROM transactions
                WHERE id = ?
                AND user_id = ?
                FOR UPDATE
                `,
      [transactionId, userId],
    );

    const transaction = transactions[0];

    if (!transaction) {
      await connection.rollback();
      return false;
    }

    if (transaction.type === "income") {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance - ?
                WHERE id = ?
                AND user_id = ?
                `,
        [transaction.amount, transaction.account_id, userId],
      );
    } else {
      await connection.query(
        `
                UPDATE accounts
                SET balance = balance + ?
                WHERE id = ?
                AND user_id = ?
                `,
        [transaction.amount, transaction.account_id, userId],
      );
    }

    const [result] = await connection.query(
      `
                DELETE FROM transactions
                WHERE id = ?
                AND user_id = ?
                `,
      [transactionId, userId],
    );

    await connection.commit();

    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
};
