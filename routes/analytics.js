const express = require('express');
const router = express.Router();

// Import yoga plans to get pending count
const yogaPlansRouter = require('./yoga-plans');

// Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    // Calculate analytics data
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    // Get actual data from in-memory stores
    const plansStore = require('./yoga-plans').plansStore;
    const eventsStore = require('./events').eventsStore;
    const usersStore = require('./users').usersStore;

    const tenantKey = req.tenantKey || 'default';
    const plans = plansStore.get(tenantKey) || [];
    const events = eventsStore.get(tenantKey) || [];
    const users = usersStore.get(tenantKey) || [];

    // Calculate real counts
    const pendingCount = plans.filter(plan => plan.status === 'pending_approval').length;
    const totalPlans = plans.length;
    const totalEvents = events.length;
    const totalUsers = users.length;

    // Calculate some mock revenue based on events
    const baseRevenue = events.length * 50; // $50 per event average
    const weekRevenue = Math.min(events.length * 250, 5400); // Cap at 5400 for demo

    const analytics = {
      totalUsers: totalUsers,
      totalEvents: totalEvents,
      totalPlans: totalPlans,
      pendingApprovals: pendingCount,
      upcomingEvents: [],
      recentActivity: [], // Will be populated with real activity
      todayStats: {
        sessions: events.length,
        bookings: events.length * 3,
        revenue: baseRevenue,
        attendance: 0
      },
      weekStats: {
        totalSessions: events.length * 2,
        totalBookings: events.length * 5,
        totalRevenue: weekRevenue,
        avgAttendance: 0
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get event analytics
router.get('/events', async (req, res) => {
  try {
    const events = require('./events').events || [];
    const eventAnalytics = {
      totalEvents: events.length,
      upcomingEvents: 0,
      pastEvents: 0,
      averageAttendance: 0,
      popularTimes: [],
      eventTypes: {
        classes: 0,
        workshops: 0,
        retreats: 0
      }
    };
    
    res.json(eventAnalytics);
  } catch (error) {
    console.error('Event analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch event analytics' });
  }
});

// Get user analytics
router.get('/users', async (req, res) => {
  try {
    const usersStore = require('./users').usersStore;
    const tenantKey = req.tenantKey || 'default';
    const users = usersStore.get(tenantKey) || [];
    const userAnalytics = {
      totalUsers: users.length,
      activeUsers: 0,
      newUsersThisMonth: 0,
      retentionRate: 0,
      userGrowth: []
    };
    
    res.json(userAnalytics);
  } catch (error) {
    console.error('User analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

// Get revenue analytics
router.get('/revenue', async (req, res) => {
  try {
    const revenueAnalytics = {
      totalRevenue: 0,
      monthlyRevenue: 0,
      averagePerSession: 0,
      revenueGrowth: 0,
      topServices: []
    };
    
    res.json(revenueAnalytics);
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

module.exports = router;