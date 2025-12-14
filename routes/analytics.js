const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const YogaPlan = require('../models/YogaPlan');
const { optionalWixAuth } = require('../middleware/wixSdkAuth');

// Get dashboard analytics
router.get('/dashboard', optionalWixAuth, async (req, res) => {
  try {
    // Calculate analytics data
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const tenantKey = req.tenantKey || 'default';

    // Check if database is connected
    const mongoose = require('mongoose');
    let plans = [];
    let events = [];

    if (mongoose.connection.readyState === 1) {
      // Build query - filter by instanceId if authenticated
      const baseQuery = { tenantKey };

      // If user is authenticated via Wix, filter by their instanceId
      if (req.wix && req.wix.instanceId) {
        baseQuery.instanceId = req.wix.instanceId;
        console.log('Analytics - Filtering by instanceId:', req.wix.instanceId);
      } else {
        console.log('Analytics - No Wix auth, showing all data for tenant');
      }

      // Get actual data from MongoDB with instanceId filter
      plans = await YogaPlan.find(baseQuery);
      events = await Event.find(baseQuery);

      console.log('Analytics - Filtered plans found:', plans.length);
      console.log('Analytics - Filtered events found:', events.length);
    } else {
      console.log('GET /analytics/dashboard - Database not connected, using empty data');
    }

    // Get users from in-memory store (will be replaced when User model is created)
    const usersStore = require('./users').usersStore;
    const users = usersStore.get(tenantKey) || [];

    // Calculate unique participants from events (these are the actual "active members")
    const uniqueParticipants = new Set();
    events.forEach(event => {
      if (event.participants && Array.isArray(event.participants)) {
        event.participants.forEach(participant => {
          // Use email or userId as unique identifier
          const identifier = participant.email || participant.userId || participant.name;
          if (identifier) {
            uniqueParticipants.add(identifier);
          }
        });
      }
    });

    // Debug logging
    console.log('Analytics - Tenant Key:', tenantKey);
    console.log('Analytics - InstanceId filter:', req.wix?.instanceId || 'none');
    console.log('Analytics - Registered users in usersStore:', users.length);
    console.log('Analytics - Unique event participants:', uniqueParticipants.size);
    console.log('Analytics - Plans found:', plans.length);
    console.log('Analytics - Events found:', events.length);

    // Calculate real counts
    const pendingCount = plans.filter(plan => plan.status === 'pending_approval').length;
    const totalPlans = plans.length;
    const totalEvents = events.length;

    // For totalUsers: if filtering by instanceId, use only unique participants from filtered events
    // Otherwise, count both registered users AND unique event participants
    const totalUsers = (req.wix && req.wix.instanceId)
      ? uniqueParticipants.size
      : Math.max(users.length, uniqueParticipants.size);

    // Calculate some mock revenue based on events
    const baseRevenue = events.length * 50; // $50 per event average
    const weekRevenue = Math.min(events.length * 250, 5400); // Cap at 5400 for demo

    // Calculate attendance rate for last 30 days and previous 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    // Filter events for last 30 days
    const last30DaysEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate <= now && eventDate >= thirtyDaysAgo;
    });

    // Filter events for 30-60 days ago
    const previous30DaysEvents = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate < thirtyDaysAgo && eventDate >= sixtyDaysAgo;
    });

    // Calculate attendance rate for last 30 days
    const calculateAttendanceRate = (eventsList) => {
      if (eventsList.length === 0) return 0;

      let totalAttended = 0;
      let totalCapacity = 0;

      eventsList.forEach(event => {
        const participants = event.participants?.length || 0;
        const capacity = event.maxParticipants || 20;
        totalAttended += participants;
        totalCapacity += capacity;
      });

      return totalCapacity > 0 ? Math.round((totalAttended / totalCapacity) * 100) : 0;
    };

    const currentAttendanceRate = calculateAttendanceRate(last30DaysEvents);
    const previousAttendanceRate = calculateAttendanceRate(previous30DaysEvents);

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
        attendance: currentAttendanceRate
      },
      weekStats: {
        totalSessions: events.length * 2,
        totalBookings: events.length * 5,
        totalRevenue: weekRevenue,
        avgAttendance: currentAttendanceRate,
        previousAttendance: previousAttendanceRate
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

// Get instructor analytics
router.get('/instructors', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';

    // Get instructors from in-memory store
    const instructorsStore = require('./instructors').instructorsStore;
    const instructors = instructorsStore.get(tenantKey) || [];

    const instructorAnalytics = {
      totalInstructors: instructors.length,
      activeInstructors: instructors.filter(i => i.status === 'active').length,
      totalClasses: instructors.reduce((sum, i) => sum + (i.totalClasses || 0), 0),
      averageRating: instructors.length > 0
        ? instructors.reduce((sum, i) => sum + (i.rating || 0), 0) / instructors.length
        : 0,
      topInstructors: instructors
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 5)
        .map(i => ({
          id: i.id,
          name: i.name,
          rating: i.rating || 0,
          totalClasses: i.totalClasses || 0,
          activeStudents: i.activeStudents || 0
        }))
    };

    res.json(instructorAnalytics);
  } catch (error) {
    console.error('Instructor analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch instructor analytics' });
  }
});

module.exports = router;