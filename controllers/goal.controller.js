const goalService = require("../services/goal.service");

const {
  validateRequiredString,
} = require("../utils/validation");

function isValidId(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

function isValidDate(date) {
  if (typeof date !== "string") {
    return false;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  if (!dateRegex.test(date)) {
    return false;
  }

  const dateObject = new Date(`${date}T00:00:00`);

  if (Number.isNaN(dateObject.getTime())) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);

  return (
    dateObject.getFullYear() === year &&
    dateObject.getMonth() + 1 === month &&
    dateObject.getDate() === day
  );
}

function validateTargetDate(targetDate) {
  if (
    targetDate === undefined ||
    targetDate === null ||
    targetDate === ""
  ) {
    return null;
  }

  if (!isValidDate(targetDate)) {
    return "Invalid target date. Use YYYY-MM-DD";
  }

  return null;
}

async function getGoals(req, res) {
  try {
    const userId = req.user.id;

    const goals = await goalService.getGoals(userId);

    return res.status(200).json({
      success: true,
      data: goals,
    });
  } catch (error) {
    console.error("Get goals error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch goals",
    });
  }
}

async function getGoalById(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    if (!isValidId(goalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    const goal = await goalService.getGoalById(
      userId,
      Number(goalId),
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error("Get goal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch goal",
    });
  }
}

async function createGoal(req, res) {
  try {
    const userId = req.user.id;

    const {
      name,
      description,
      target_amount,
      target_date,
    } = req.body;

    const nameError = validateRequiredString(
      name,
      "Goal name",
      100,
    );

    if (nameError) {
      return res.status(400).json({
        success: false,
        message: nameError,
      });
    }

    if (
      typeof target_amount !== "number" ||
      !Number.isFinite(target_amount) ||
      target_amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Target amount must be a number greater than 0",
      });
    }

    if (
      description !== undefined &&
      description !== null
    ) {
      const descriptionError = validateRequiredString(
        description,
        "Description",
        255,
      );

      if (descriptionError) {
        return res.status(400).json({
          success: false,
          message: descriptionError,
        });
      }
    }

    const targetDateError =
      validateTargetDate(target_date);

    if (targetDateError) {
      return res.status(400).json({
        success: false,
        message: targetDateError,
      });
    }

    const goal = await goalService.createGoal(
      userId,
      name.trim(),
      typeof description === "string"
        ? description.trim()
        : null,
      target_amount,
      target_date || null,
    );

    return res.status(201).json({
      success: true,
      message: "Goal created successfully",
      data: goal,
    });
  } catch (error) {
    console.error("Create goal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create goal",
    });
  }
}

async function updateGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    if (!isValidId(goalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    const {
      name,
      description,
      target_amount,
      target_date,
      status,
    } = req.body;

    const nameError = validateRequiredString(
      name,
      "Goal name",
      100,
    );

    if (nameError) {
      return res.status(400).json({
        success: false,
        message: nameError,
      });
    }

    if (
      typeof target_amount !== "number" ||
      !Number.isFinite(target_amount) ||
      target_amount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Target amount must be a number greater than 0",
      });
    }

    if (typeof status !== "string") {
      return res.status(400).json({
        success: false,
        message: "Status must be a string",
      });
    }

    const normalizedStatus = status
      .trim()
      .toLowerCase();

    const allowedStatuses = [
      "active",
      "completed",
      "cancelled",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be active, completed, or cancelled",
      });
    }

    if (
      description !== undefined &&
      description !== null
    ) {
      const descriptionError = validateRequiredString(
        description,
        "Description",
        255,
      );

      if (descriptionError) {
        return res.status(400).json({
          success: false,
          message: descriptionError,
        });
      }
    }

    const targetDateError =
      validateTargetDate(target_date);

    if (targetDateError) {
      return res.status(400).json({
        success: false,
        message: targetDateError,
      });
    }

    const goal = await goalService.updateGoal(
      userId,
      Number(goalId),
      name.trim(),
      typeof description === "string"
        ? description.trim()
        : null,
      target_amount,
      target_date || null,
      normalizedStatus,
    );

    if (!goal) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Goal updated successfully",
      data: goal,
    });
  } catch (error) {
    console.error("Update goal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update goal",
    });
  }
}

async function deleteGoal(req, res) {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;

    if (!isValidId(goalId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal ID",
      });
    }

    const deleted = await goalService.deleteGoal(
      userId,
      Number(goalId),
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Goal not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Goal deleted successfully",
    });
  } catch (error) {
    console.error("Delete goal error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete goal",
    });
  }
}

module.exports = {
  getGoals,
  getGoalById,
  createGoal,
  updateGoal,
  deleteGoal,
};