const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Mock notifications data
const mockNotifications = [
  {
    id: 'notif-1',
    userId: 'user-1',
    type: 'class_reminder',
    title: 'Upcoming Yoga Class',
    message: 'Your Vinyasa Flow class with Sarah starts in 1 hour',
    status: 'unread',
    priority: 'high',
    createdAt: new Date('2025-09-21T10:00:00'),
    scheduledFor: new Date('2025-09-21T11:00:00'),
    data: {
      classId: 'class-1',
      instructorName: 'Sarah Johnson',
      classType: 'Vinyasa Flow'
    }
  },
  {
    id: 'notif-2',
    userId: 'user-1',
    type: 'payment_success',
    title: 'Payment Successful',
    message: 'Your monthly subscription has been renewed',
    status: 'read',
    priority: 'normal',
    createdAt: new Date('2025-09-01T00:00:00'),
    data: {
      amount: 59.99,
      subscriptionId: 'sub-1'
    }
  },
  {
    id: 'notif-3',
    userId: 'user-2',
    type: 'plan_approved',
    title: 'Yoga Plan Approved',
    message: 'Your personalized yoga plan has been approved by an instructor',
    status: 'unread',
    priority: 'normal',
    createdAt: new Date('2025-09-20T14:30:00'),
    data: {
      planId: 'plan-2',
      instructorName: 'Michael Chen'
    }
  }
];

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to Yoga Studio!',
    html: (data) => `
      <h2>Welcome ${data.name}!</h2>
      <p>We're thrilled to have you join our yoga community.</p>
      <p>Your journey to wellness starts here. Explore our classes, connect with instructors, and track your progress.</p>
      <a href="${data.loginUrl}" style="background:#116DFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Get Started</a>
    `
  },
  class_reminder: {
    subject: 'Class Starting Soon',
    html: (data) => `
      <h2>Your class is starting soon!</h2>
      <p>${data.classType} with ${data.instructorName} starts at ${data.startTime}</p>
      <p>Don't forget to bring your yoga mat and water bottle.</p>
      <a href="${data.classUrl}" style="background:#116DFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Class Details</a>
    `
  },
  subscription_renewal: {
    subject: 'Subscription Renewed',
    html: (data) => `
      <h2>Your subscription has been renewed</h2>
      <p>Thank you for continuing your yoga journey with us!</p>
      <p>Amount charged: $${data.amount}</p>
      <p>Next billing date: ${data.nextBillingDate}</p>
      <a href="${data.accountUrl}" style="background:#116DFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Manage Subscription</a>
    `
  },
  plan_approved: {
    subject: 'Your Yoga Plan is Ready!',
    html: (data) => `
      <h2>Great news! Your personalized yoga plan has been approved</h2>
      <p>${data.instructorName} has reviewed and approved your plan.</p>
      <p>You can now start following your customized yoga routine.</p>
      <a href="${data.planUrl}" style="background:#116DFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">View Your Plan</a>
    `
  },
  class_cancelled: {
    subject: 'Class Cancelled',
    html: (data) => `
      <h2>Class Cancellation Notice</h2>
      <p>We're sorry, but the ${data.classType} class scheduled for ${data.scheduledTime} has been cancelled.</p>
      <p>You can book another class or we'll automatically credit your account.</p>
      <a href="${data.bookingUrl}" style="background:#116DFF;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Book Another Class</a>
    `
  }
};

// Configure email transporter (mock for development)
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Development mock transporter
  return {
    sendMail: async (options) => {
      console.log('📧 Email would be sent:', {
        to: options.to,
        subject: options.subject,
        preview: options.text?.substring(0, 100) || options.html?.substring(0, 100)
      });
      return { messageId: `mock-${Date.now()}`, accepted: [options.to] };
    }
  };
};

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get all notifications
 *     description: Retrieve all notifications for the current user
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] || 'user-1';
  const userNotifications = mockNotifications.filter(n => n.userId === userId);

  res.json({
    notifications: userNotifications,
    total: userNotifications.length,
    unreadCount: userNotifications.filter(n => n.status === 'unread').length
  });
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification by ID
 */
router.get('/:id', (req, res) => {
  const notification = mockNotifications.find(n => n.id === req.params.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json(notification);
});

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     tags: [Notifications]
 *     summary: Create new notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               type:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 */
router.post('/', (req, res) => {
  const { userId, type, title, message, priority = 'normal', data } = req.body;

  const newNotification = {
    id: `notif-${Date.now()}`,
    userId,
    type,
    title,
    message,
    status: 'unread',
    priority,
    createdAt: new Date(),
    data
  };

  mockNotifications.push(newNotification);

  // Send push notification if enabled
  if (req.body.sendPush) {
    // Here you would integrate with a push notification service
    console.log('📱 Push notification would be sent:', newNotification);
  }

  res.status(201).json({
    message: 'Notification created successfully',
    notification: newNotification
  });
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 */
router.put('/:id/read', (req, res) => {
  const notification = mockNotifications.find(n => n.id === req.params.id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  notification.status = 'read';
  notification.readAt = new Date();

  res.json({
    message: 'Notification marked as read',
    notification
  });
});

/**
 * @swagger
 * /api/notifications/mark-all-read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all notifications as read
 */
router.put('/mark-all-read', (req, res) => {
  const userId = req.headers['x-user-id'] || 'user-1';
  const userNotifications = mockNotifications.filter(n => n.userId === userId);

  userNotifications.forEach(notification => {
    if (notification.status === 'unread') {
      notification.status = 'read';
      notification.readAt = new Date();
    }
  });

  res.json({
    message: 'All notifications marked as read',
    updatedCount: userNotifications.filter(n => n.status === 'read').length
  });
});

/**
 * @swagger
 * /api/notifications/email:
 *   post:
 *     tags: [Notifications]
 *     summary: Send email notification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               template:
 *                 type: string
 *               data:
 *                 type: object
 */
router.post('/email', async (req, res) => {
  const { to, template, data, customSubject, customHtml } = req.body;

  try {
    const transporter = createTransporter();

    let emailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@yogastudio.com',
      to
    };

    if (template && emailTemplates[template]) {
      emailOptions.subject = emailTemplates[template].subject;
      emailOptions.html = emailTemplates[template].html(data);
    } else if (customSubject && customHtml) {
      emailOptions.subject = customSubject;
      emailOptions.html = customHtml;
    } else {
      return res.status(400).json({ error: 'Invalid email template or custom content' });
    }

    const result = await transporter.sendMail(emailOptions);

    // Log email in notifications
    const emailNotification = {
      id: `email-${Date.now()}`,
      userId: data.userId || 'system',
      type: 'email_sent',
      title: emailOptions.subject,
      message: `Email sent to ${to}`,
      status: 'read',
      priority: 'low',
      createdAt: new Date(),
      data: { messageId: result.messageId, template }
    };

    mockNotifications.push(emailNotification);

    res.json({
      message: 'Email sent successfully',
      messageId: result.messageId,
      accepted: result.accepted
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notification preferences
 */
router.get('/preferences/:userId', (req, res) => {
  // Mock preferences - in production, fetch from database
  const preferences = {
    userId: req.params.userId,
    email: {
      classReminders: true,
      paymentReceipts: true,
      planUpdates: true,
      marketing: false,
      weeklyDigest: true
    },
    push: {
      classReminders: true,
      planUpdates: true,
      instructorMessages: true
    },
    sms: {
      classReminders: false,
      urgentNotices: true
    },
    quiet: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  };

  res.json(preferences);
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     tags: [Notifications]
 *     summary: Update notification preferences
 */
router.put('/preferences/:userId', (req, res) => {
  const { email, push, sms, quiet } = req.body;

  // In production, save to database
  const updatedPreferences = {
    userId: req.params.userId,
    email: email || {},
    push: push || {},
    sms: sms || {},
    quiet: quiet || {},
    updatedAt: new Date()
  };

  res.json({
    message: 'Preferences updated successfully',
    preferences: updatedPreferences
  });
});

/**
 * @swagger
 * /api/notifications/schedule:
 *   post:
 *     tags: [Notifications]
 *     summary: Schedule a notification
 */
router.post('/schedule', (req, res) => {
  const { userId, type, title, message, scheduledFor, data } = req.body;

  const scheduledNotification = {
    id: `scheduled-${Date.now()}`,
    userId,
    type,
    title,
    message,
    status: 'scheduled',
    priority: 'normal',
    createdAt: new Date(),
    scheduledFor: new Date(scheduledFor),
    data
  };

  // In production, this would be saved to a queue or scheduler
  mockNotifications.push(scheduledNotification);

  res.status(201).json({
    message: 'Notification scheduled successfully',
    notification: scheduledNotification
  });
});

/**
 * @swagger
 * /api/notifications/bulk:
 *   post:
 *     tags: [Notifications]
 *     summary: Send bulk notifications
 */
router.post('/bulk', async (req, res) => {
  const { userIds, type, title, message, priority = 'normal', sendEmail = false } = req.body;

  const notifications = [];
  const emailPromises = [];

  for (const userId of userIds) {
    const notification = {
      id: `bulk-${Date.now()}-${userId}`,
      userId,
      type,
      title,
      message,
      status: 'unread',
      priority,
      createdAt: new Date()
    };

    notifications.push(notification);
    mockNotifications.push(notification);

    if (sendEmail) {
      // Mock email sending
      emailPromises.push(Promise.resolve({
        userId,
        status: 'sent',
        messageId: `email-${Date.now()}-${userId}`
      }));
    }
  }

  const emailResults = await Promise.all(emailPromises);

  res.status(201).json({
    message: 'Bulk notifications sent successfully',
    notificationCount: notifications.length,
    emailsSent: emailResults.length
  });
});

module.exports = router;