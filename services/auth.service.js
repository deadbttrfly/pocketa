const pool = require("../config/db");
const bcrypt = require("bcrypt");

async function findUserByEmail(email) {
    const [rows] = await pool.query(
        "SELECT * FROM users WHERE email = ? LIMIT 1",
        [email]
    );

    return rows[0];
}

async function createUser(name, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
        `INSERT INTO users (name, email, password)
         VALUES (?, ?, ?)`,
        [name, email, hashedPassword]
    );

    return {
        id: result.insertId,
        name,
        email,
    };
}

module.exports = {
    findUserByEmail,
    createUser,
};