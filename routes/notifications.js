const express = require('express');
const router = express.Router();

// In-memory notifications store (will be replaced with database when available)
const notificationsStore = new Map();

// Get all notifications for a tenant
router.get('/', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const notifications = notificationsStore.get(tenantKey) || [];

    res.json({
      notifications,
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const notifications = notificationsStore.get(tenantKey) || [];

    notifications.forEach(notification => {
      notification.read = true;
      notification.readAt = new Date();
    });

    notificationsStore.set(tenantKey, notifications);

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Clear all notifications
router.post('/clear-all', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    notificationsStore.set(tenantKey, []);

    res.json({ success: true, message: 'All notifications cleared' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

// Mark single notification as read
router.post('/:id/read', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const notifications = notificationsStore.get(tenantKey) || [];

    const notification = notifications.find(n => n.id === req.params.id);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date();
      notificationsStore.set(tenantKey, notifications);
    }

    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Create a new notification (helper function for other routes)
function createNotification(tenantKey, notification) {
  const notifications = notificationsStore.get(tenantKey) || [];

  const newNotification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    read: false,
    createdAt: new Date(),
    ...notification
  };

  notifications.unshift(newNotification);

  // Keep only last 50 notifications
  if (notifications.length > 50) {
    notifications.splice(50);
  }

  notificationsStore.set(tenantKey, notifications);
  return newNotification;
}

// Export both router and helper function
module.exports = router;
module.exports.createNotification = createNotification;
module.exports.notificationsStore = notificationsStore;
