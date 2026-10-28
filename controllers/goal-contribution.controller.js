const goalContributionService = require("../services/goal-contribution.service");

async function getContributions(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.goalId);

    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    const contributions = await goalContributionService.getContributions(
      userId,
      goalId,
    );

    return res.status(200).json({
      success: true,
      data: contributions,
    });
  } catch (error) {
    console.error("Get contributions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contributions",
    });
  }
}

async function getContributionById(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.goalId);
    const contributionId = Number(req.params.id);

    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    if (!Number.isInteger(contributionId) || contributionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution ID",
      });
    }

    const contribution = await goalContributionService.getContributionById(
      userId,
      goalId,
      contributionId,
    );

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: "Contribution not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: contribution,
    });
  } catch (error) {
    console.error("Get contribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch contribution",
    });
  }
}

async function createContribution(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.goalId);

    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    const { amount, contribution_date, note } = req.body;

    const contributionAmount = Number(amount);

    if (!Number.isFinite(contributionAmount) || contributionAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Contribution amount must be greater than 0",
      });
    }

    if (!contribution_date) {
      return res.status(400).json({
        success: false,
        message: "Contribution date is required",
      });
    }

    const date = new Date(contribution_date);

    if (Number.isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution date",
      });
    }

    if (note !== undefined && note !== null && typeof note !== "string") {
      return res.status(400).json({
        success: false,
        message: "Note must be a string",
      });
    }

    const contribution = await goalContributionService.createContribution(
      userId,
      goalId,
      contributionAmount,
      contribution_date,
      note?.trim() || null,
    );

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Contribution created successfully",
      data: contribution,
    });
  } catch (error) {
    console.error("Create contribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create contribution",
    });
  }
}

async function deleteContribution(req, res) {
  try {
    const userId = req.user.id;
    const goalId = Number(req.params.goalId);
    const contributionId = Number(req.params.id);

    if (!Number.isInteger(goalId) || goalId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    if (!Number.isInteger(contributionId) || contributionId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid contribution ID",
      });
    }

    const deleted = await goalContributionService.deleteContribution(
      userId,
      goalId,
      contributionId,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Contribution not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Contribution deleted successfully",
    });
  } catch (error) {
    console.error("Delete contribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete contribution",
    });
  }
}

module.exports = {
  getContributions,
  getContributionById,
  createContribution,
  deleteContribution,
};
