const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const goalController = require("../controllers/goal.controller");

router.use(authMiddleware);

router.get("/", goalController.getGoals);

router.get("/:id", goalController.getGoalById);

router.post("/", goalController.createGoal);

router.put("/:id", goalController.updateGoal);

router.delete("/:id", goalController.deleteGoal);

module.exports = router;
