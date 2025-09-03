const express = require('express');
const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    // Calculate analytics data
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const analytics = {
      totalUsers: 245,
      totalEvents: 42,
      totalPlans: 18,
      pendingApprovals: 3,
      upcomingEvents: [],
      recentActivity: [
        {
          id: 1,
          type: 'booking',
          description: 'New booking for Morning Yoga',
          user: 'Sarah Johnson',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 2,
          type: 'registration',
          description: 'New member joined',
          user: 'Mike Chen',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 3,
          type: 'plan',
          description: 'Yoga plan approved',
          user: 'Emily Davis',
          timestamp: new Date(Date.now() - 10800000).toISOString()
        }
      ],
      todayStats: {
        sessions: 8,
        bookings: 42,
        revenue: 1250,
        attendance: 85
      },
      weekStats: {
        totalSessions: 35,
        totalBookings: 180,
        totalRevenue: 5400,
        avgAttendance: 78
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
    const eventAnalytics = {
      totalEvents: 42,
      upcomingEvents: 15,
      pastEvents: 27,
      averageAttendance: 78,
      popularTimes: [
        { hour: '9:00 AM', count: 25 },
        { hour: '6:00 PM', count: 35 },
        { hour: '7:00 PM', count: 32 }
      ],
      eventTypes: {
        classes: 30,
        workshops: 8,
        retreats: 4
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
    const userAnalytics = {
      totalUsers: 245,
      activeUsers: 180,
      newUsersThisMonth: 28,
      retentionRate: 85,
      userGrowth: [
        { month: 'Jan', users: 150 },
        { month: 'Feb', users: 170 },
        { month: 'Mar', users: 195 },
        { month: 'Apr', users: 220 },
        { month: 'May', users: 245 }
      ]
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
      totalRevenue: 24500,
      monthlyRevenue: 5400,
      averagePerSession: 35,
      revenueGrowth: 15,
      topServices: [
        { name: 'Vinyasa Flow', revenue: 8500 },
        { name: 'Private Sessions', revenue: 6200 },
        { name: 'Workshops', revenue: 4800 },
        { name: 'Monthly Memberships', revenue: 5000 }
      ]
    };
    
    res.json(revenueAnalytics);
  } catch (error) {
    console.error('Revenue analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

module.exports = router;