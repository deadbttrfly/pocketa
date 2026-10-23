const express = require("express");
const router = express.Router({ mergeParams: true });

const authMiddleware = require("../middleware/auth.middleware");
const goalContributionController = require("../controllers/goal-contribution.controller");

router.use(authMiddleware);

router.get("/", goalContributionController.getContributions);

router.get("/:id", goalContributionController.getContributionById);

router.post("/", goalContributionController.createContribution);

router.delete("/:id", goalContributionController.deleteContribution);

module.exports = router;
