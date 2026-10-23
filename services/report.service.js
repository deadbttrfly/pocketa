const db = require("../config/db");

const getDateRange = (startDate, endDate) => {
  const today = new Date();

  const defaultStartDate = `${today.getFullYear()}-01-01`;
  const defaultEndDate = today.toISOString().split("T")[0];

  const start = startDate || defaultStartDate;
  const end = endDate || defaultEndDate;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(start) || !dateRegex.test(end)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD");
  }

  const startDateObj = new Date(`${start}T00:00:00`);
  const endDateObj = new Date(`${end}T00:00:00`);

  if (
    Number.isNaN(startDateObj.getTime()) ||
    Number.isNaN(endDateObj.getTime())
  ) {
    throw new Error("Invalid date");
  }

  if (startDateObj > endDateObj) {
    throw new Error("Start date cannot be after end date");
  }

  return {
    startDate: start,
    endDate: end,
  };
};

const getSummary = async (userId, startDate, endDate) => {
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  const [rows] = await db.query(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN type = 'income' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_income,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'expense' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS total_expense,

        COUNT(*) AS transaction_count

      FROM transactions

      WHERE user_id = ?
        AND transaction_date BETWEEN ? AND ?
    `,
    [userId, start, end],
  );

  const totalIncome = Number(rows[0].total_income);
  const totalExpense = Number(rows[0].total_expense);

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_cash_flow: totalIncome - totalExpense,
    transaction_count: Number(rows[0].transaction_count),
    start_date: start,
    end_date: end,
  };
};

const getIncomeExpense = async (userId, startDate, endDate) => {
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  const [rows] = await db.query(
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN type = 'income' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'expense' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS expense

      FROM transactions

      WHERE user_id = ?
        AND transaction_date BETWEEN ? AND ?
    `,
    [userId, start, end],
  );

  const income = Number(rows[0].income);
  const expense = Number(rows[0].expense);

  return {
    income,
    expense,
    net: income - expense,
    start_date: start,
    end_date: end,
  };
};

const getExpensesByCategory = async (userId, startDate, endDate) => {
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  const [rows] = await db.query(
    `
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        COALESCE(SUM(t.amount), 0) AS amount

      FROM transactions t

      INNER JOIN categories c
        ON c.id = t.category_id

      WHERE t.user_id = ?
        AND c.user_id = ?
        AND t.type = 'expense'
        AND t.transaction_date BETWEEN ? AND ?

      GROUP BY
        c.id,
        c.name

      ORDER BY amount DESC
    `,
    [userId, userId, start, end],
  );

  return {
    start_date: start,
    end_date: end,
    categories: rows.map((row) => ({
      category_id: row.category_id,
      category_name: row.category_name,
      amount: Number(row.amount),
    })),
  };
};

const getMonthlyTrend = async (userId, startDate, endDate) => {
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  const [rows] = await db.query(
    `
      SELECT
        DATE_FORMAT(transaction_date, '%Y-%m') AS month,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'income' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS income,

        COALESCE(
          SUM(
            CASE
              WHEN type = 'expense' THEN amount
              ELSE 0
            END
          ),
          0
        ) AS expense

      FROM transactions

      WHERE user_id = ?
        AND transaction_date BETWEEN ? AND ?

      GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')

      ORDER BY month ASC
    `,
    [userId, start, end],
  );

  return {
    start_date: start,
    end_date: end,
    months: rows.map((row) => ({
      month: row.month,
      income: Number(row.income),
      expense: Number(row.expense),
    })),
  };
};

const getBudgetPerformance = async (userId, startDate, endDate) => {
  const { startDate: start, endDate: end } = getDateRange(startDate, endDate);

  const [rows] = await db.query(
    `
      SELECT
        b.id AS budget_id,
        b.category_id,
        c.name AS category_name,
        b.amount AS budget_amount,

        COALESCE(
          (
            SELECT SUM(t.amount)
            FROM transactions t
            WHERE t.user_id = b.user_id
              AND t.category_id = b.category_id
              AND t.type = 'expense'
              AND t.transaction_date BETWEEN
                  GREATEST(b.start_date, ?)
                  AND LEAST(b.end_date, ?)
          ),
          0
        ) AS spent_amount

      FROM budgets b

      INNER JOIN categories c
        ON c.id = b.category_id

      WHERE b.user_id = ?
        AND c.user_id = ?
        AND b.start_date <= ?
        AND b.end_date >= ?

      ORDER BY b.start_date DESC
    `,
    [start, end, userId, userId, end, start],
  );

  return {
    start_date: start,
    end_date: end,
    budgets: rows.map((row) => {
      const budgetAmount = Number(row.budget_amount);
      const spentAmount = Number(row.spent_amount);

      return {
        budget_id: row.budget_id,
        category_id: row.category_id,
        category_name: row.category_name,
        budget_amount: budgetAmount,
        spent_amount: spentAmount,
        remaining_amount: budgetAmount - spentAmount,
        percentage_used:
          budgetAmount > 0
            ? Number(((spentAmount / budgetAmount) * 100).toFixed(2))
            : 0,
      };
    }),
  };
};

module.exports = {
  getSummary,
  getIncomeExpense,
  getExpensesByCategory,
  getMonthlyTrend,
  getBudgetPerformance,
};
