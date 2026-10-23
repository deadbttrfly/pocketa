const pool = require("../config/db");

async function getAllBudgets(userId) {
    const [rows] = await pool.query(
        `
        SELECT
            b.id,
            b.category_id,
            c.name AS category_name,
            b.amount,
            b.start_date,
            b.end_date,
            b.created_at,
            b.updated_at
        FROM budgets b
        INNER JOIN categories c
            ON b.category_id = c.id
        WHERE b.user_id = ?
        ORDER BY
            b.start_date DESC,
            b.created_at DESC
        `,
        [userId]
    );

    return rows;
}

async function getBudgetById(
    userId,
    budgetId
) {
    const [rows] = await pool.query(
        `
        SELECT
            b.id,
            b.category_id,
            c.name AS category_name,
            b.amount,
            b.start_date,
            b.end_date,
            b.created_at,
            b.updated_at
        FROM budgets b
        INNER JOIN categories c
            ON b.category_id = c.id
        WHERE b.id = ?
        AND b.user_id = ?
        LIMIT 1
        `,
        [budgetId, userId]
    );

    return rows[0];
}

async function createBudget(
    userId,
    categoryId,
    amount,
    startDate,
    endDate
) {
    const [categories] = await pool.query(
        `
        SELECT
            id,
            name,
            type
        FROM categories
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
        `,
        [categoryId, userId]
    );

    const category = categories[0];

    if (!category) {
        throw new Error(
            "CATEGORY_NOT_FOUND"
        );
    }

    if (category.type !== "expense") {
        throw new Error(
            "CATEGORY_NOT_EXPENSE"
        );
    }

    const [result] = await pool.query(
        `
        INSERT INTO budgets
            (
                user_id,
                category_id,
                amount,
                start_date,
                end_date
            )
        VALUES
            (?, ?, ?, ?, ?)
        `,
        [
            userId,
            categoryId,
            amount,
            startDate,
            endDate,
        ]
    );

    return getBudgetById(
        userId,
        result.insertId
    );
}

async function updateBudget(
    userId,
    budgetId,
    categoryId,
    amount,
    startDate,
    endDate
) {
    const [existingBudgets] =
        await pool.query(
            `
            SELECT
                id
            FROM budgets
            WHERE id = ?
            AND user_id = ?
            LIMIT 1
            `,
            [budgetId, userId]
        );

    if (!existingBudgets[0]) {
        return null;
    }

    const [categories] = await pool.query(
        `
        SELECT
            id,
            name,
            type
        FROM categories
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
        `,
        [categoryId, userId]
    );

    const category = categories[0];

    if (!category) {
        throw new Error(
            "CATEGORY_NOT_FOUND"
        );
    }

    if (category.type !== "expense") {
        throw new Error(
            "CATEGORY_NOT_EXPENSE"
        );
    }

    await pool.query(
        `
        UPDATE budgets
        SET
            category_id = ?,
            amount = ?,
            start_date = ?,
            end_date = ?
        WHERE id = ?
        AND user_id = ?
        `,
        [
            categoryId,
            amount,
            startDate,
            endDate,
            budgetId,
            userId,
        ]
    );

    return getBudgetById(
        userId,
        budgetId
    );
}

async function deleteBudget(
    userId,
    budgetId
) {
    const [result] = await pool.query(
        `
        DELETE FROM budgets
        WHERE id = ?
        AND user_id = ?
        `,
        [budgetId, userId]
    );

    return result.affectedRows > 0;
}

module.exports = {
    getAllBudgets,
    getBudgetById,
    createBudget,
    updateBudget,
    deleteBudget,
};