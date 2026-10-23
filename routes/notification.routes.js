
const express = require("express");

const notificationController = require(
    "../controllers/notification.controller"
);

const authenticateToken = require("../middleware/auth.middleware");

const router = express.Router();

router.use(authenticateToken);

router.get("/", notificationController.getAll);

router.post("/sync", notificationController.sync);

router.patch("/read-all", notificationController.markAllRead);

router.patch("/:id/read", notificationController.markRead);

router.delete("/:id", notificationController.remove);

module.exports = router;

