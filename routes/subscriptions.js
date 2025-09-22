const express = require('express');
const router = express.Router();

// Mock subscriptions data
const mockSubscriptions = [
  {
    id: 'sub-1',
    userId: 'user-1',
    planId: 'basic',
    planName: 'Basic Membership',
    status: 'active',
    price: 29.99,
    billingCycle: 'monthly',
    features: [
      'Access to 10 classes per month',
      'Basic yoga plans',
      'Community forum access',
      'Mobile app access'
    ],
    startDate: new Date('2025-08-01'),
    nextBillingDate: new Date('2025-10-01'),
    paymentMethod: 'card_ending_4242',
    autoRenew: true
  },
  {
    id: 'sub-2',
    userId: 'user-2',
    planId: 'premium',
    planName: 'Premium Membership',
    status: 'active',
    price: 59.99,
    billingCycle: 'monthly',
    features: [
      'Unlimited classes',
      'Advanced yoga plans with AI customization',
      'Priority instructor booking',
      '1-on-1 monthly consultation',
      'Access to workshops and events',
      'Guest passes (2 per month)'
    ],
    startDate: new Date('2025-07-15'),
    nextBillingDate: new Date('2025-10-15'),
    paymentMethod: 'card_ending_5555',
    autoRenew: true
  },
  {
    id: 'sub-3',
    userId: 'user-3',
    planId: 'elite',
    planName: 'Elite Annual',
    status: 'active',
    price: 999.99,
    billingCycle: 'yearly',
    features: [
      'Everything in Premium',
      'Personal instructor assignment',
      'Custom meal plans',
      'Quarterly health assessments',
      'VIP event access',
      'Unlimited guest passes',
      'Merchandise discount (20%)'
    ],
    startDate: new Date('2025-01-01'),
    nextBillingDate: new Date('2026-01-01'),
    paymentMethod: 'card_ending_9999',
    autoRenew: true,
    discount: {
      amount: 200,
      code: 'EARLY2025'
    }
  }
];

// Available subscription plans
const availablePlans = [
  {
    id: 'basic',
    name: 'Basic Membership',
    price: {
      monthly: 29.99,
      yearly: 299.99
    },
    features: [
      'Access to 10 classes per month',
      'Basic yoga plans',
      'Community forum access',
      'Mobile app access'
    ],
    recommended: false
  },
  {
    id: 'premium',
    name: 'Premium Membership',
    price: {
      monthly: 59.99,
      yearly: 599.99
    },
    features: [
      'Unlimited classes',
      'Advanced yoga plans with AI customization',
      'Priority instructor booking',
      '1-on-1 monthly consultation',
      'Access to workshops and events',
      'Guest passes (2 per month)'
    ],
    recommended: true
  },
  {
    id: 'elite',
    name: 'Elite Membership',
    price: {
      monthly: 99.99,
      yearly: 999.99
    },
    features: [
      'Everything in Premium',
      'Personal instructor assignment',
      'Custom meal plans',
      'Quarterly health assessments',
      'VIP event access',
      'Unlimited guest passes',
      'Merchandise discount (20%)'
    ],
    recommended: false
  }
];

/**
 * @swagger
 * /api/subscriptions/plans:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get available subscription plans
 *     description: Retrieve all available subscription plans
 *     responses:
 *       200:
 *         description: List of available plans
 */
router.get('/plans', (req, res) => {
  res.json({
    plans: availablePlans,
    total: availablePlans.length
  });
});

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get all subscriptions
 *     description: Retrieve all subscriptions (admin only)
 *     responses:
 *       200:
 *         description: List of subscriptions
 */
router.get('/', (req, res) => {
  const { status, planId } = req.query;

  let filteredSubs = [...mockSubscriptions];

  if (status) {
    filteredSubs = filteredSubs.filter(sub => sub.status === status);
  }

  if (planId) {
    filteredSubs = filteredSubs.filter(sub => sub.planId === planId);
  }

  res.json({
    subscriptions: filteredSubs,
    total: filteredSubs.length,
    metrics: {
      totalRevenue: filteredSubs.reduce((sum, sub) => sum + sub.price, 0),
      activeSubscriptions: filteredSubs.filter(s => s.status === 'active').length,
      churnRate: 2.5 // Mock churn rate percentage
    }
  });
});

/**
 * @swagger
 * /api/subscriptions/user/{userId}:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get user subscription
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/user/:userId', (req, res) => {
  const subscription = mockSubscriptions.find(s => s.userId === req.params.userId);

  if (!subscription) {
    return res.status(404).json({ error: 'No subscription found for this user' });
  }

  res.json(subscription);
});

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Create new subscription
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *               planId:
 *                 type: string
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               paymentMethod:
 *                 type: string
 */
router.post('/', (req, res) => {
  const { userId, planId, billingCycle, paymentMethod, promoCode } = req.body;

  const plan = availablePlans.find(p => p.id === planId);
  if (!plan) {
    return res.status(400).json({ error: 'Invalid plan ID' });
  }

  const price = plan.price[billingCycle] || plan.price.monthly;
  let discount = null;

  // Apply promo code if provided
  if (promoCode === 'YOGA2025') {
    discount = { amount: price * 0.2, code: promoCode }; // 20% discount
  }

  const newSubscription = {
    id: `sub-${Date.now()}`,
    userId,
    planId,
    planName: plan.name,
    status: 'active',
    price: discount ? price - discount.amount : price,
    billingCycle,
    features: plan.features,
    startDate: new Date(),
    nextBillingDate: calculateNextBillingDate(billingCycle),
    paymentMethod,
    autoRenew: true,
    discount
  };

  mockSubscriptions.push(newSubscription);

  res.status(201).json({
    message: 'Subscription created successfully',
    subscription: newSubscription
  });
});

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   put:
 *     tags: [Subscriptions]
 *     summary: Update subscription
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.put('/:id', (req, res) => {
  const index = mockSubscriptions.findIndex(s => s.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const updates = req.body;

  // Handle plan change
  if (updates.planId && updates.planId !== mockSubscriptions[index].planId) {
    const newPlan = availablePlans.find(p => p.id === updates.planId);
    if (newPlan) {
      updates.planName = newPlan.name;
      updates.features = newPlan.features;
      updates.price = newPlan.price[mockSubscriptions[index].billingCycle] || newPlan.price.monthly;
    }
  }

  mockSubscriptions[index] = {
    ...mockSubscriptions[index],
    ...updates,
    id: req.params.id // Preserve ID
  };

  res.json({
    message: 'Subscription updated successfully',
    subscription: mockSubscriptions[index]
  });
});

/**
 * @swagger
 * /api/subscriptions/{id}/cancel:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cancel subscription
 */
router.post('/:id/cancel', (req, res) => {
  const subscription = mockSubscriptions.find(s => s.id === req.params.id);

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  subscription.status = 'cancelled';
  subscription.cancelledAt = new Date();
  subscription.autoRenew = false;

  res.json({
    message: 'Subscription cancelled successfully',
    subscription
  });
});

/**
 * @swagger
 * /api/subscriptions/{id}/reactivate:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Reactivate cancelled subscription
 */
router.post('/:id/reactivate', (req, res) => {
  const subscription = mockSubscriptions.find(s => s.id === req.params.id);

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  if (subscription.status !== 'cancelled') {
    return res.status(400).json({ error: 'Subscription is not cancelled' });
  }

  subscription.status = 'active';
  subscription.reactivatedAt = new Date();
  subscription.autoRenew = true;
  subscription.nextBillingDate = calculateNextBillingDate(subscription.billingCycle);

  res.json({
    message: 'Subscription reactivated successfully',
    subscription
  });
});

/**
 * @swagger
 * /api/subscriptions/{id}/usage:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscription usage statistics
 */
router.get('/:id/usage', (req, res) => {
  const subscription = mockSubscriptions.find(s => s.id === req.params.id);

  if (!subscription) {
    return res.status(404).json({ error: 'Subscription not found' });
  }

  const usage = {
    subscriptionId: subscription.id,
    currentPeriod: {
      start: subscription.startDate,
      end: subscription.nextBillingDate
    },
    classesAttended: subscription.planId === 'basic' ? 7 : 23,
    classesRemaining: subscription.planId === 'basic' ? 3 : 'unlimited',
    workshopsAttended: subscription.planId !== 'basic' ? 2 : 0,
    guestPassesUsed: subscription.planId === 'premium' ? 1 : subscription.planId === 'elite' ? 3 : 0,
    consultationsUsed: subscription.planId !== 'basic' ? 1 : 0,
    savingsThisMonth: calculateSavings(subscription)
  };

  res.json(usage);
});

/**
 * @swagger
 * /api/subscriptions/stats:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Get subscription statistics
 */
router.get('/stats', (req, res) => {
  const activeSubscriptions = mockSubscriptions.filter(s => s.status === 'active');

  const stats = {
    totalSubscriptions: mockSubscriptions.length,
    activeSubscriptions: activeSubscriptions.length,
    monthlyRecurringRevenue: activeSubscriptions
      .filter(s => s.billingCycle === 'monthly')
      .reduce((sum, s) => sum + s.price, 0),
    yearlyRecurringRevenue: activeSubscriptions
      .filter(s => s.billingCycle === 'yearly')
      .reduce((sum, s) => sum + s.price, 0),
    averageSubscriptionValue: activeSubscriptions.length > 0
      ? activeSubscriptions.reduce((sum, s) => sum + s.price, 0) / activeSubscriptions.length
      : 0,
    planDistribution: {
      basic: activeSubscriptions.filter(s => s.planId === 'basic').length,
      premium: activeSubscriptions.filter(s => s.planId === 'premium').length,
      elite: activeSubscriptions.filter(s => s.planId === 'elite').length
    },
    churnRate: 2.5,
    growthRate: 12.3
  };

  res.json(stats);
});

// Helper functions
function calculateNextBillingDate(billingCycle) {
  const date = new Date();
  if (billingCycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}

function calculateSavings(subscription) {
  // Calculate savings based on drop-in class prices
  const dropInPrice = 15; // $15 per class
  const classesAttended = subscription.planId === 'basic' ? 7 : 23;
  const wouldHavePaid = classesAttended * dropInPrice;
  return Math.max(0, wouldHavePaid - subscription.price);
}

module.exports = router;