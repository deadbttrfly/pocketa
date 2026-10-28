const { getDashboard } = require("../services/dashboard.service");

async function getDashboardData(req, res) {
  try {
    const userId = req.user.id;

    const dashboard = await getDashboard(userId);

    return res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

module.exports = {
  getDashboardData,
};
