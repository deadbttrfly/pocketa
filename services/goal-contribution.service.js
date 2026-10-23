const db = require("../config/db");

async function getContributions(userId, goalId) {
  const [rows] = await db.execute(
    `
      SELECT
        gc.id,
        gc.goal_id,
        gc.amount,
        gc.contribution_date,
        gc.note,
        gc.created_at
      FROM goal_contributions gc
      INNER JOIN goals g
        ON g.id = gc.goal_id
      WHERE gc.goal_id = ?
        AND g.user_id = ?
      ORDER BY
        gc.contribution_date DESC,
        gc.created_at DESC
    `,
    [goalId, userId],
  );

  return rows.map(formatContribution);
}

async function getContributionById(
  userId,
  goalId,
  contributionId,
) {
  const [rows] = await db.execute(
    `
      SELECT
        gc.id,
        gc.goal_id,
        gc.amount,
        gc.contribution_date,
        gc.note,
        gc.created_at
      FROM goal_contributions gc
      INNER JOIN goals g
        ON g.id = gc.goal_id
      WHERE gc.id = ?
        AND gc.goal_id = ?
        AND g.user_id = ?
    `,
    [contributionId, goalId, userId],
  );

  if (rows.length === 0) {
    return null;
  }

  return formatContribution(rows[0]);
}

async function createContribution(
  userId,
  goalId,
  amount,
  contributionDate,
  note,
) {
  // Pastikan goal memang milik user yang sedang login.
  const [goals] = await db.execute(
    `
      SELECT id
      FROM goals
      WHERE id = ?
        AND user_id = ?
    `,
    [goalId, userId],
  );

  if (goals.length === 0) {
    return null;
  }

  const [result] = await db.execute(
    `
      INSERT INTO goal_contributions (
        goal_id,
        amount,
        contribution_date,
        note
      )
      VALUES (?, ?, ?, ?)
    `,
    [
      goalId,
      amount,
      contributionDate,
      note || null,
    ],
  );

  return getContributionById(
    userId,
    goalId,
    result.insertId,
  );
}

async function deleteContribution(
  userId,
  goalId,
  contributionId,
) {
  const [result] = await db.execute(
    `
      DELETE gc
      FROM goal_contributions gc
      INNER JOIN goals g
        ON g.id = gc.goal_id
      WHERE gc.id = ?
        AND gc.goal_id = ?
        AND g.user_id = ?
    `,
    [contributionId, goalId, userId],
  );

  return result.affectedRows > 0;
}

function formatContribution(contribution) {
  return {
    id: contribution.id,
    goal_id: contribution.goal_id,
    amount: Number(contribution.amount).toFixed(2),
    contribution_date: contribution.contribution_date,
    note: contribution.note,
    created_at: contribution.created_at,
  };
}

module.exports = {
  getContributions,
  getContributionById,
  createContribution,
  deleteContribution,
};
