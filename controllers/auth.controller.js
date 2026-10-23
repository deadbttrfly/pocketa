
const {
    findUserByEmail,
    createUser,
} = require("../services/auth.service");

const { validateRequiredString } = require("../utils/validation");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const MAX_EMAIL_LENGTH = 150;
const MIN_PASSWORD_LENGTH = 6;

function validateEmail(email) {
    const emailError = validateRequiredString(
        email,
        "Email",
        MAX_EMAIL_LENGTH,
    );

    if (emailError) {
        return emailError;
    }

    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return "Invalid email format";
    }

    return null;
}

function validatePassword(password) {
    if (typeof password !== "string" || password.length === 0) {
        return "Password is required";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    return null;
}

async function register(req, res) {
    try {
        const { name, email, password } = req.body ?? {};

        const nameError = validateRequiredString(name, "Name", 100);

        if (nameError) {
            return res.status(400).json({
                success: false,
                message: nameError,
            });
        }

        const emailError = validateEmail(email);

        if (emailError) {
            return res.status(400).json({
                success: false,
                message: emailError,
            });
        }

        const passwordError = validatePassword(password);

        if (passwordError) {
            return res.status(400).json({
                success: false,
                message: passwordError,
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await findUserByEmail(normalizedEmail);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        const user = await createUser(
            normalizedName,
            normalizedEmail,
            password,
        );

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Email is already registered",
            });
        }

        console.error("Register error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body ?? {};

        const emailError = validateEmail(email);

        if (emailError) {
            return res.status(400).json({
                success: false,
                message: emailError,
            });
        }

        if (typeof password !== "string" || password.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Password is required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await findUserByEmail(normalizedEmail);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const passwordMatches = await bcrypt.compare(
            password,
            user.password,
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const jwtSecret = process.env.JWT_SECRET;

        if (typeof jwtSecret !== "string" || !jwtSecret.trim()) {
            console.error("JWT_SECRET is missing or invalid");

            return res.status(500).json({
                success: false,
                message: "Authentication service is not configured",
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            jwtSecret,
            {
                expiresIn: "1d",
                algorithm: "HS256",
            },
        );

        return res.status(200).json({
            success: true,
            message: "Login successful",
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
                token,
            },
        });
    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}

module.exports = {
    register,
    login,
};
