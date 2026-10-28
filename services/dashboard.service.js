const pool = require("../config/db");

async function getDashboardSummary(userId) {
  const [rows] = await pool.query(
    `
        SELECT
            COALESCE(
                (
                    SELECT SUM(balance)
                    FROM accounts
                    WHERE user_id = ?
                    AND is_active = TRUE
                ),
                0
            ) AS balance,

            COALESCE(
                (
                    SELECT SUM(amount)
                    FROM transactions
                    WHERE user_id = ?
                    AND type = 'income'
                    AND YEAR(transaction_date) = YEAR(CURDATE())
                    AND MONTH(transaction_date) = MONTH(CURDATE())
                ),
                0
            ) AS income,

            COALESCE(
                (
                    SELECT SUM(amount)
                    FROM transactions
                    WHERE user_id = ?
                    AND type = 'expense'
                    AND YEAR(transaction_date) = YEAR(CURDATE())
                    AND MONTH(transaction_date) = MONTH(CURDATE())
                ),
                0
            ) AS expense
        `,
    [userId, userId, userId],
  );

  return rows[0];
}

async function getExpenseByCategory(userId) {
  const [rows] = await pool.query(
    `
        SELECT
            c.id AS category_id,
            c.name AS category_name,
            COALESCE(SUM(t.amount), 0) AS amount
        FROM categories c
        INNER JOIN transactions t
            ON t.category_id = c.id
            AND t.user_id = ?
            AND t.type = 'expense'
            AND YEAR(t.transaction_date) = YEAR(CURDATE())
            AND MONTH(t.transaction_date) = MONTH(CURDATE())
        WHERE c.user_id = ?
        AND c.type = 'expense'
        GROUP BY
            c.id,
            c.name
        ORDER BY amount DESC
        `,
    [userId, userId],
  );

  return rows;
}

async function getBudgetSummary(userId) {
  const [rows] = await pool.query(
    `
        SELECT
            b.id,
            b.category_id,
            c.name AS category_name,
            b.amount AS budget,

            COALESCE(
                (
                    SELECT SUM(t.amount)
                    FROM transactions t
                    WHERE t.user_id = ?
                    AND t.category_id = b.category_id
                    AND t.type = 'expense'
                    AND t.transaction_date
                        BETWEEN b.start_date
                        AND b.end_date
                ),
                0
            ) AS spent

        FROM budgets b
        INNER JOIN categories c
            ON b.category_id = c.id

        WHERE b.user_id = ?

        ORDER BY b.start_date DESC
        `,
    [userId, userId],
  );

  return rows.map((budget) => ({
    id: budget.id,
    category_id: budget.category_id,
    category_name: budget.category_name,
    budget: budget.budget,
    spent: budget.spent,
    remaining: Number(budget.budget) - Number(budget.spent),
  }));
}

async function getRecentTransactions(userId) {
  const [rows] = await pool.query(
    `
        SELECT
            t.id,
            t.category_id,
            c.name AS category_name,
            t.type,
            t.amount,
            t.description,
            t.transaction_date,
            t.created_at
        FROM transactions t
        INNER JOIN categories c
            ON t.category_id = c.id
        WHERE t.user_id = ?
        ORDER BY
            t.transaction_date DESC,
            t.created_at DESC
        LIMIT 5
        `,
    [userId],
  );

  return rows;
}

async function getDashboard(userId) {
  const [summary, expenseByCategory, budgets, recentTransactions] =
    await Promise.all([
      getDashboardSummary(userId),
      getExpenseByCategory(userId),
      getBudgetSummary(userId),
      getRecentTransactions(userId),
    ]);

  return {
    summary,
    expense_by_category: expenseByCategory,
    budgets,
    recent_transactions: recentTransactions,
  };
}

module.exports = {
  getDashboard,
};
