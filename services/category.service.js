const pool = require("../config/db");

async function getAllCategories(userId, type = null) {
    let query = `
        SELECT
            id,
            name,
            type,
            created_at,
            updated_at
        FROM categories
        WHERE user_id = ?
    `;

    const params = [userId];

    if (type) {
        query += " AND type = ?";
        params.push(type);
    }

    query += " ORDER BY created_at DESC";

    const [rows] = await pool.query(query, params);

    return rows;
}

async function getCategoryById(userId, categoryId) {
    const [rows] = await pool.query(
        `
        SELECT
            id,
            name,
            type,
            created_at,
            updated_at
        FROM categories
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
        `,
        [categoryId, userId]
    );

    return rows[0];
}

async function createCategory(userId, name, type) {
    const [result] = await pool.query(
        `
        INSERT INTO categories
            (user_id, name, type)
        VALUES
            (?, ?, ?)
        `,
        [userId, name, type]
    );

    return {
        id: result.insertId,
        name,
        type,
    };
}

async function updateCategory(
    userId,
    categoryId,
    name,
    type
) {
    const [result] = await pool.query(
        `
        UPDATE categories
        SET
            name = ?,
            type = ?
        WHERE id = ?
        AND user_id = ?
        `,
        [name, type, categoryId, userId]
    );

    if (result.affectedRows === 0) {
        return null;
    }

    return getCategoryById(userId, categoryId);
}

async function deleteCategory(userId, categoryId) {
    const [result] = await pool.query(
        `
        DELETE FROM categories
        WHERE id = ?
        AND user_id = ?
        `,
        [categoryId, userId]
    );

    return result.affectedRows > 0;
}

module.exports = {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
};