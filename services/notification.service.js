const pool = require("../config/db");

const MAX_NOTIFICATIONS = 100;

async function createNotification({
  userId,
  type,
  title,
  message,
  link = null,
  dedupeKey,
}) {
  if (!userId || !dedupeKey) {
    throw new Error("USER_ID_AND_DEDUPE_KEY_REQUIRED");
  }

  const [result] = await pool.query(
    `
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            dedupe_key
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            id = LAST_INSERT_ID(id)
        `,
    [userId, type, title, message, link, dedupeKey],
  );

  return result.insertId;
}

async function getNotifications(userId) {
  const [rows] = await pool.query(
    `
        SELECT
            id,
            type,
            title,
            message,
            link,
            is_read,
            created_at
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT ?
        `,
    [userId, MAX_NOTIFICATIONS],
  );

  const [countRows] = await pool.query(
    `
        SELECT COUNT(*) AS unread_count
        FROM notifications
        WHERE user_id = ?
        AND is_read = 0
        `,
    [userId],
  );

  return {
    notifications: rows,
    unread_count: Number(countRows[0].unread_count),
  };
}

async function markNotificationRead(userId, notificationId) {
  const [result] = await pool.query(
    `
        UPDATE notifications
        SET is_read = 1
        WHERE id = ?
        AND user_id = ?
        `,
    [notificationId, userId],
  );

  return result.affectedRows > 0;
}

async function markAllNotificationsRead(userId) {
  const [result] = await pool.query(
    `
        UPDATE notifications
        SET is_read = 1
        WHERE user_id = ?
        AND is_read = 0
        `,
    [userId],
  );

  return result.affectedRows;
}

async function deleteNotification(userId, notificationId) {
  const [result] = await pool.query(
    `
        DELETE FROM notifications
        WHERE id = ?
        AND user_id = ?
        `,
    [notificationId, userId],
  );

  return result.affectedRows > 0;
}

async function syncNotifications(userId) {
  const [budgets] = await pool.query(
    `
        SELECT
            b.id,
            b.category_id,
            b.amount AS budget,
            b.start_date,
            b.end_date,
            c.name AS category_name,
            COALESCE(
                (
                    SELECT SUM(t.amount)
                    FROM transactions t
                    WHERE t.user_id = b.user_id
                    AND t.category_id = b.category_id
                    AND t.type = 'expense'
                    AND t.transaction_date BETWEEN
                        b.start_date AND LEAST(b.end_date, CURDATE())
                ),
                0
            ) AS spent
        FROM budgets b
        INNER JOIN categories c
            ON c.id = b.category_id
        WHERE b.user_id = ?
        AND b.start_date <= CURDATE()
        AND b.end_date >= CURDATE()
        `,
    [userId],
  );

  for (const budget of budgets) {
    const limit = Number(budget.budget);
    const spent = Number(budget.spent);

    if (!Number.isFinite(limit) || limit <= 0) {
      continue;
    }

    const percentage = (spent / limit) * 100;

    let level = null;

    if (percentage >= 100) {
      level = 100;
    } else if (percentage >= 80) {
      level = 80;
    }

    if (level === null) {
      continue;
    }

    const formattedSpent = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(spent);

    const formattedLimit = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(limit);

    await createNotification({
      userId,
      type: "budget_alert",
      title:
        level === 100
          ? `Anggaran ${budget.category_name} terlampaui`
          : `Anggaran ${budget.category_name} hampir habis`,
      message:
        level === 100
          ? `Pengeluaran ${formattedSpent} sudah mencapai atau melebihi anggaran ${formattedLimit}.`
          : `Pengeluaran ${formattedSpent} sudah mencapai ${Math.floor(percentage)}% dari anggaran ${formattedLimit}.`,
      link: "/budgets",
      dedupeKey: `budget:${budget.id}:${budget.start_date}:${budget.end_date}:${level}`,
    });
  }

  const [recurringRows] = await pool.query(
    `
        SELECT
            rt.id,
            rt.description,
            rt.amount,
            rt.type,
            rt.next_occurrence,
            c.name AS category_name
        FROM recurring_transactions rt
        INNER JOIN categories c
            ON c.id = rt.category_id
        INNER JOIN accounts a
            ON a.id = rt.account_id
            AND a.user_id = rt.user_id
        WHERE rt.user_id = ?
        AND rt.is_active = 1
        AND a.is_active = 1
        AND rt.next_occurrence <= CURDATE()
        AND (
            rt.end_date IS NULL
            OR rt.end_date >= rt.next_occurrence
        )
        ORDER BY rt.next_occurrence ASC, rt.id ASC
        `,
    [userId],
  );

  for (const recurring of recurringRows) {
    await createNotification({
      userId,
      type: "recurring_due",
      title: "Transaksi berulang jatuh tempo",
      message:
        `${recurring.description || recurring.category_name} ` +
        `dijadwalkan pada ${recurring.next_occurrence}. ` +
        "Periksa jadwal sebelum memproses transaksi.",
      link: "/recurring",
      dedupeKey: `recurring-due:${recurring.id}:${recurring.next_occurrence}`,
    });
  }

  return getNotifications(userId);
}

module.exports = {
  createNotification,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  syncNotifications,
};
