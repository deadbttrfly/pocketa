const pool = require("../config/db");

async function getAllAccounts(userId, includeInactive = false) {
  let query = `
        SELECT
            id,
            name,
            type,
            balance,
            is_active,
            created_at,
            updated_at
        FROM accounts
        WHERE user_id = ?
    `;

  const params = [userId];

  if (!includeInactive) {
    query += " AND is_active = TRUE";
  }

  query += " ORDER BY created_at DESC";

  const [rows] = await pool.query(query, params);

  return rows;
}

async function getAccountById(userId, accountId) {
  const [rows] = await pool.query(
    `
        SELECT
            id,
            name,
            type,
            balance,
            is_active,
            created_at,
            updated_at
        FROM accounts
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
        `,
    [accountId, userId],
  );

  return rows[0];
}

async function createAccount(userId, name, type, balance = 0) {
  const [result] = await pool.query(
    `
        INSERT INTO accounts
            (user_id, name, type, balance)
        VALUES
            (?, ?, ?, ?)
        `,
    [userId, name, type, balance],
  );

  return {
    id: result.insertId,
    name,
    type,
    balance,
    is_active: true,
  };
}

async function updateAccount(userId, accountId, name, type) {
  const [result] = await pool.query(
    `
        UPDATE accounts
        SET
            name = ?,
            type = ?
        WHERE id = ?
        AND user_id = ?
        `,
    [name, type, accountId, userId],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getAccountById(userId, accountId);
}

async function deleteAccount(userId, accountId) {
  const [result] = await pool.query(
    `
        UPDATE accounts
        SET is_active = FALSE
        WHERE id = ?
        AND user_id = ?
        AND is_active = TRUE
        `,
    [accountId, userId],
  );

  return result.affectedRows > 0;
}

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
};
