const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const {
  startRecurringTransactionScheduler,
  stopRecurringTransactionScheduler,
} = require("./services/recurring-transaction.scheduler");

const app = express();

const PORT = process.env.PORT || 8000;

app.use(cors());

app.use((req, res, next) => {
  const methods = ["POST", "PUT", "PATCH"];

  if (
    methods.includes(req.method) &&
    req.path.startsWith("/api/") &&
    !req.is("application/json")
  ) {
    return res.status(400).json({
      success: false,
      message: "Content-Type must be application/json",
    });
  }

  next();
});

app.use(express.json());

// =========================
// ROUTES
// =========================

const authRoutes = require("./routes/auth.routes");
const accountRoutes = require("./routes/account.routes");
const categoryRoutes = require("./routes/category.routes");
const transactionRoutes = require("./routes/transaction.routes");
const budgetRoutes = require("./routes/budget.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const goalRoutes = require("./routes/goal.routes");
const goalContributionRoutes = require("./routes/goal-contribution.routes");
const recurringTransactionRoutes = require("./routes/recurring-transaction.routes");
const reportRoutes = require("./routes/report.routes");
const notificationRoutes = require("./routes/notification.routes");

app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/goals", goalRoutes);

app.use("/api/goals/:goalId/contributions", goalContributionRoutes);

app.use("/api/recurring-transactions", recurringTransactionRoutes);

app.use("/api/reports", reportRoutes);

app.use("/api/notifications", notificationRoutes);

// =========================
// ROOT
// =========================

app.get("/", (req, res) => {
  res.json({
    message: "Pocketa API is running 🚀",
  });
});

// =========================
// HEALTH CHECK
// =========================

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT 1 AS database_status");

    res.json({
      success: true,
      message: "Pocketa API and database are running 🚀",
      database: rows[0].database_status === 1 ? "connected" : "disconnected",
    });
  } catch (error) {
    console.error("Health check error:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// =========================
// 404 NOT FOUND HANDLER
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================
// GLOBAL ERROR HANDLER
// =========================

app.use((error, req, res, next) => {
  console.error("Global error:", error);

  // Malformed JSON
  if (
    error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload",
    });
  }

  // Unsupported Content-Type / body parsing errors
  if (error.type === "entity.unsupported") {
    return res.status(400).json({
      success: false,
      message: "Unsupported content type",
    });
  }

  // Request entity too large
  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request body is too large",
    });
  }

  // Default server error
  return res.status(error.status || 500).json({
    success: false,
    message:
      error.status && error.status < 500
        ? error.message
        : "Internal server error",
  });
});

const server = app.listen(PORT, () => {
  console.log(`Pocketa API running on http://localhost:${PORT}`);

  startRecurringTransactionScheduler();
});

function shutdown(signal) {
  console.log(`${signal} received. Shutting down Pocketa API...`);

  stopRecurringTransactionScheduler();

  server.close(() => {
    pool
      .end()
      .then(() => {
        console.log("Pocketa API shutdown complete.");
        process.exit(0);
      })
      .catch((error) => {
        console.error("Database pool shutdown error:", error);
        process.exit(1);
      });
  });
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
