const reportService = require("../services/report.service");

const handleReportError = (res, error, defaultMessage) => {
  console.error(defaultMessage, error);

  const validationErrors = [
    "Invalid date format. Use YYYY-MM-DD",
    "Invalid date",
    "Start date cannot be after end date",
  ];

  if (validationErrors.includes(error.message)) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message: defaultMessage,
  });
};

const getSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    const data = await reportService.getSummary(userId, start_date, end_date);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleReportError(res, error, "Failed to generate report summary");
  }
};

const getIncomeExpense = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    const data = await reportService.getIncomeExpense(
      userId,
      start_date,
      end_date,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleReportError(
      res,
      error,
      "Failed to generate income expense report",
    );
  }
};

const getExpensesByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    const data = await reportService.getExpensesByCategory(
      userId,
      start_date,
      end_date,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleReportError(
      res,
      error,
      "Failed to generate expenses by category report",
    );
  }
};

const getMonthlyTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    const data = await reportService.getMonthlyTrend(
      userId,
      start_date,
      end_date,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleReportError(
      res,
      error,
      "Failed to generate monthly trend report",
    );
  }
};

const getBudgetPerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    const data = await reportService.getBudgetPerformance(
      userId,
      start_date,
      end_date,
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return handleReportError(
      res,
      error,
      "Failed to generate budget performance report",
    );
  }
};

module.exports = {
  getSummary,
  getIncomeExpense,
  getExpensesByCategory,
  getMonthlyTrend,
  getBudgetPerformance,
};
