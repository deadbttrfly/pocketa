const db = require("../config/db");

async function getGoals(userId) {
  const [rows] = await db.execute(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        g.target_amount,
        g.target_date,
        g.status,
        g.created_at,
        g.updated_at,
        COALESCE(SUM(gc.amount), 0) AS current_amount
      FROM goals g
      LEFT JOIN goal_contributions gc
        ON gc.goal_id = g.id
      WHERE g.user_id = ?
      GROUP BY
        g.id,
        g.name,
        g.description,
        g.target_amount,
        g.target_date,
        g.status,
        g.created_at,
        g.updated_at
      ORDER BY
        g.created_at DESC
    `,
    [userId],
  );

  return rows.map(formatGoal);
}

async function getGoalById(userId, goalId) {
  const [rows] = await db.execute(
    `
      SELECT
        g.id,
        g.name,
        g.description,
        g.target_amount,
        g.target_date,
        g.status,
        g.created_at,
        g.updated_at,
        COALESCE(SUM(gc.amount), 0) AS current_amount
      FROM goals g
      LEFT JOIN goal_contributions gc
        ON gc.goal_id = g.id
      WHERE g.id = ?
        AND g.user_id = ?
      GROUP BY
        g.id,
        g.name,
        g.description,
        g.target_amount,
        g.target_date,
        g.status,
        g.created_at,
        g.updated_at
    `,
    [goalId, userId],
  );

  if (rows.length === 0) {
    return null;
  }

  return formatGoal(rows[0]);
}

async function createGoal(
  userId,
  name,
  description,
  targetAmount,
  targetDate,
) {
  const [result] = await db.execute(
    `
      INSERT INTO goals (
        user_id,
        name,
        description,
        target_amount,
        target_date
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      userId,
      name,
      description || null,
      targetAmount,
      targetDate || null,
    ],
  );

  return getGoalById(userId, result.insertId);
}

async function updateGoal(
  userId,
  goalId,
  name,
  description,
  targetAmount,
  targetDate,
  status,
) {
  const [result] = await db.execute(
    `
      UPDATE goals
      SET
        name = ?,
        description = ?,
        target_amount = ?,
        target_date = ?,
        status = ?
      WHERE id = ?
        AND user_id = ?
    `,
    [
      name,
      description || null,
      targetAmount,
      targetDate || null,
      status,
      goalId,
      userId,
    ],
  );

  if (result.affectedRows === 0) {
    return null;
  }

  return getGoalById(userId, goalId);
}

async function deleteGoal(userId, goalId) {
  const [result] = await db.execute(
    `
      DELETE FROM goals
      WHERE id = ?
        AND user_id = ?
    `,
    [goalId, userId],
  );

  return result.affectedRows > 0;
}

function formatGoal(goal) {
  const targetAmount = Number(goal.target_amount);
  const currentAmount = Number(goal.current_amount);

  const remainingAmount = Math.max(
    targetAmount - currentAmount,
    0,
  );

  const progressPercentage =
    targetAmount > 0
      ? Math.min(
          (currentAmount / targetAmount) * 100,
          100,
        )
      : 0;

  return {
    id: goal.id,
    name: goal.name,
    description: goal.description,
    target_amount: goal.target_amount,
    current_amount: currentAmount.toFixed(2),
    remaining_amount: remainingAmount.toFixed(2),
    progress_percentage: Number(
      progressPercentage.toFixed(2),
    ),
    target_date: goal.target_date,
    status: goal.status,
    created_at: goal.created_at,
    updated_at: goal.updated_at,
  };
}

module.exports = {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
};
