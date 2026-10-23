const notificationService = require("../services/notification.service");

function isValidId(id) {
  return /^\d+$/.test(id) && Number(id) > 0;
}

async function getAll(req, res) {
  try {
    const data = await notificationService.getNotifications(req.user.id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications",
    });
  }
}

async function sync(req, res) {
  try {
    const data = await notificationService.syncNotifications(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Notifications synchronized successfully",
      data,
    });
  } catch (error) {
    console.error("Sync notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to synchronize notifications",
    });
  }
}

async function markRead(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const updated = await notificationService.markNotificationRead(
      req.user.id,
      id,
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
}

async function markAllRead(req, res) {
  try {
    const updatedCount = await notificationService.markAllNotificationsRead(
      req.user.id,
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
      data: {
        updated_count: updatedCount,
      },
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications",
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const deleted = await notificationService.deleteNotification(
      req.user.id,
      id,
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
}

module.exports = {
  getAll,
  sync,
  markRead,
  markAllRead,
  remove,
};
