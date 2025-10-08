const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');
const Event = require('../models/Event');

/**
 * @swagger
 * /api/yoga-plans:
 *   get:
 *     tags: [Yoga Plans]
 *     summary: Get all AI-generated events (formerly yoga plans)
 *     description: Retrieve a list of all AI-generated events grouped by plan
 *     responses:
 *       200:
 *         description: List of yoga plans (as events)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                 total:
 *                   type: number
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const tenantKey = req.tenantKey || 'default';

    const filter = {
      tenantKey,
      aiGenerated: true,
      generatedFrom: 'yoga_plan'
    };

    if (status) {
      filter.approvalStatus = status;
    }

    // Get all AI-generated events
    const events = await Event.find(filter).sort({ createdAt: -1 });

    // Group events by planId to create "plans"
    const plansMap = new Map();

    events.forEach(event => {
      const planId = event.planId || event._id.toString();

      if (!plansMap.has(planId)) {
        plansMap.set(planId, {
          id: planId,
          name: event.planName,
          userId: event.planData?.userId,
          formData: event.planData?.formData,
          difficulty: event.planData?.difficulty || event.level,
          duration: event.planData?.duration,
          status: event.approvalStatus,
          aiGenerated: true,
          requiresApproval: true,
          createdAt: event.createdAt,
          sessions: event.planData?.sessions || [],
          events: [],
          rejectionReason: event.rejectionReason,
          approvedBy: event.approvedBy,
          approvedAt: event.approvedAt,
          rejectedBy: event.rejectedBy,
          rejectedAt: event.rejectedAt,
          tenantKey
        });
      }

      plansMap.get(planId).events.push(event);
    });

    const plans = Array.from(plansMap.values());

    res.json({
      plans,
      total: plans.length
    });
  } catch (error) {
    console.error('Error fetching yoga plans:', error);
    res.status(500).json({ error: 'Failed to fetch yoga plans' });
  }
});

/**
 * @swagger
 * /api/yoga-plans/{id}:
 *   get:
 *     tags: [Yoga Plans]
 *     summary: Get yoga plan by ID
 *     description: Retrieve a specific yoga plan by its planId (returns grouped events)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The yoga plan ID
 *     responses:
 *       200:
 *         description: Yoga plan details
 *       404:
 *         description: Plan not found
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const events = await Event.find({
      planId: req.params.id,
      tenantKey,
      aiGenerated: true,
      generatedFrom: 'yoga_plan'
    });

    if (!events || events.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const firstEvent = events[0];
    const plan = {
      id: req.params.id,
      name: firstEvent.planName,
      userId: firstEvent.planData?.userId,
      formData: firstEvent.planData?.formData,
      difficulty: firstEvent.planData?.difficulty || firstEvent.level,
      duration: firstEvent.planData?.duration,
      status: firstEvent.approvalStatus,
      aiGenerated: true,
      requiresApproval: true,
      createdAt: firstEvent.createdAt,
      sessions: firstEvent.planData?.sessions || [],
      events: events,
      rejectionReason: firstEvent.rejectionReason,
      approvedBy: firstEvent.approvedBy,
      approvedAt: firstEvent.approvedAt,
      rejectedBy: firstEvent.rejectedBy,
      rejectedAt: firstEvent.rejectedAt,
      tenantKey
    };

    res.json(plan);
  } catch (error) {
    console.error('Error fetching yoga plan:', error);
    res.status(500).json({ error: 'Failed to fetch yoga plan' });
  }
});

/**
 * @swagger
 * /api/yoga-plans/user/{userId}:
 *   get:
 *     tags: [Yoga Plans]
 *     summary: Get plans by user ID
 *     description: Retrieve all yoga plans for a specific user (from events)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID
 *     responses:
 *       200:
 *         description: List of user's yoga plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                 total:
 *                   type: number
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const events = await Event.find({
      'planData.userId': req.params.userId,
      tenantKey,
      aiGenerated: true,
      generatedFrom: 'yoga_plan'
    }).sort({ createdAt: -1 });

    // Group events by planId
    const plansMap = new Map();

    events.forEach(event => {
      const planId = event.planId || event._id.toString();

      if (!plansMap.has(planId)) {
        plansMap.set(planId, {
          id: planId,
          name: event.planName,
          userId: event.planData?.userId,
          formData: event.planData?.formData,
          difficulty: event.planData?.difficulty || event.level,
          duration: event.planData?.duration,
          status: event.approvalStatus,
          aiGenerated: true,
          requiresApproval: true,
          createdAt: event.createdAt,
          sessions: event.planData?.sessions || [],
          events: [],
          rejectionReason: event.rejectionReason,
          approvedBy: event.approvedBy,
          approvedAt: event.approvedAt,
          rejectedBy: event.rejectedBy,
          rejectedAt: event.rejectedAt,
          tenantKey
        });
      }

      plansMap.get(planId).events.push(event);
    });

    const userPlans = Array.from(plansMap.values());

    res.json({
      plans: userPlans,
      total: userPlans.length
    });
  } catch (error) {
    console.error('Error fetching user plans:', error);
    res.status(500).json({ error: 'Failed to fetch user plans' });
  }
});

// Generate new plan with AI integration
router.post('/generate', async (req, res) => {
  try {
    const { userId, formData } = req.body;
    const tenantKey = req.tenantKey || 'default';

    // Generate a unique plan ID
    const mongoose = require('mongoose');
    const planId = new mongoose.Types.ObjectId().toString();

    // Create plan data structure
    const planData = {
      userId,
      formData,
      name: `Personalized ${formData.experience || 'Beginner'} Yoga Plan`,
      duration: '4 weeks',
      difficulty: formData.experience || 'beginner',
      sessions: generateDetailedSessions(formData),
    };

    // Notify admin about new plan pending approval
    console.log(`New plan ${planId} pending approval for user ${userId}`);

    // Create events directly from the plan data
    try {
      const eventsCreated = await createEventsFromPlanData(planId, planData, tenantKey);
      console.log(`Created ${eventsCreated.length} recurring events from new plan ${planId} - awaiting approval`);

      res.json({
        message: 'Plan generated successfully and sent for approval',
        planId: planId,
        plan: {
          id: planId,
          ...planData,
          status: 'pending_approval',
          aiGenerated: true,
          requiresApproval: true,
          tenantKey
        },
        eventsCreated: eventsCreated.length
      });
    } catch (eventError) {
      console.error('Error creating events from plan:', eventError);
      res.status(500).json({
        message: 'Failed to create events',
        error: eventError.message
      });
    }
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({ error: 'Failed to generate plan' });
  }
});

// Helper function to generate detailed sessions
function generateDetailedSessions(formData) {
  const sessions = [];
  const weeksCount = 4;
  
  for (let week = 1; week <= weeksCount; week++) {
    for (let day = 1; day <= formData.frequency; day++) {
      sessions.push({
        week,
        day,
        duration: formData.availableTime,
        poses: getPosesForLevel(formData.experience, week),
        focus: getFocusArea(formData.goals, day),
        intensity: getIntensity(week, formData.experience)
      });
    }
  }
  
  return sessions;
}

function getPosesForLevel(level, week) {
  const poses = {
    beginner: ['Mountain Pose', 'Child\'s Pose', 'Cat-Cow', 'Warrior I'],
    intermediate: ['Warrior III', 'Triangle Pose', 'Crow Pose', 'Wheel Pose'],
    advanced: ['Handstand', 'Scorpion Pose', 'Flying Pigeon', 'King Pigeon']
  };
  return poses[level] || poses.beginner;
}

function getFocusArea(goals, day) {
  const focuses = ['flexibility', 'strength', 'balance', 'relaxation'];
  return focuses[day % focuses.length];
}

function getIntensity(week, level) {
  const base = level === 'beginner' ? 'low' : level === 'intermediate' ? 'medium' : 'high';
  return week > 2 ? 'increased ' + base : base;
}

// Alias for generate endpoint - for backward compatibility
router.post('/generate-ai', async (req, res) => {
  try {
    const { userId, userData, assessment } = req.body;

    const formData = userData || assessment || {
      experience: 'beginner',
      goals: 'general fitness',
      availableTime: 30,
      frequency: 3,
      preferences: 'none'
    };

    // Prepare prompt for AI
    const prompt = `Create a personalized yoga plan for:
    - Experience: ${formData.experience}
    - Goals: ${formData.goals}
    - Health Issues: ${formData.healthIssues || 'None'}
    - Available Time: ${formData.availableTime} minutes per session
    - Frequency: ${formData.frequency} times per week
    - Preferences: ${formData.preferences}`;

    const tenantKey = req.tenantKey || 'default';

    // Generate a unique plan ID
    const mongoose = require('mongoose');
    const planId = new mongoose.Types.ObjectId().toString();

    // Create plan data structure
    const planData = {
      userId,
      formData,
      name: `Personalized ${formData.experience} Yoga Plan`,
      duration: '4 weeks',
      difficulty: formData.experience || 'beginner',
      sessions: generateDetailedSessions(formData),
    };

    // Create events directly from the plan data
    try {
      const eventsCreated = await createEventsFromPlanData(planId, planData, tenantKey);
      console.log(`Created ${eventsCreated.length} events from new plan ${planId} - awaiting approval`);

      res.json({
        success: true,
        message: 'Plan generated successfully and events created (pending approval)',
        planId: planId,
        plan: {
          id: planId,
          ...planData,
          status: 'pending_approval',
          aiGenerated: true,
          requiresApproval: true,
          tenantKey
        },
        eventsCreated: eventsCreated.length
      });
    } catch (error) {
      console.error('Error creating events from plan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create events',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in generate-ai:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI plan'
    });
  }
});

// Approve/reject plan (updates all events for the plan)
router.put('/:id/approve', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const planId = req.params.id;

    // Find all events for this plan
    const events = await Event.find({
      planId: planId,
      tenantKey,
      aiGenerated: true,
      generatedFrom: 'yoga_plan'
    });

    if (!events || events.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const approved = req.body.approved;
    const reviewerId = req.body.reviewerId || 'admin';
    const notes = req.body.notes || '';
    const reason = req.body.reason || '';

    // Update all events in the plan
    const updateData = {
      approvalStatus: approved ? 'approved' : 'rejected',
      isVisible: approved ? true : false
    };

    if (approved) {
      updateData.approvedBy = reviewerId;
      updateData.approvedAt = new Date();
      updateData.approvalNotes = notes;
    } else {
      updateData.rejectedBy = reviewerId;
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = reason;
    }

    await Event.updateMany(
      { planId: planId, tenantKey },
      { $set: updateData }
    );

    console.log(`Plan ${planId} ${approved ? 'approved' : 'rejected'} by ${reviewerId}`);

    res.json({
      message: `Plan ${approved ? 'approved' : 'rejected'}`,
      planId: planId,
      eventsUpdated: events.length,
      status: approved ? 'approved' : 'rejected'
    });
  } catch (error) {
    console.error('Error updating plan approval:', error);
    res.status(500).json({ error: 'Failed to update plan approval' });
  }
});

// Helper function to create events from plan data
async function createEventsFromPlanData(planId, planData, tenantKey) {
  const createdEvents = [];

  // Calculate start date (next Monday)
  const today = new Date();
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  startDate.setHours(9, 0, 0, 0); // Default to 9 AM

  // Group sessions by day and focus to create recurring events
  const sessionsByDayFocus = {};

  planData.sessions.forEach(session => {
    const key = `${session.day}-${session.focus}`;
    if (!sessionsByDayFocus[key]) {
      sessionsByDayFocus[key] = [];
    }
    sessionsByDayFocus[key].push(session);
  });

  // Create one recurring event for each unique day/focus combination
  for (const [key, sessions] of Object.entries(sessionsByDayFocus)) {
    const firstSession = sessions[0];
    const totalWeeks = Math.max(...sessions.map(s => s.week));

    // Calculate first occurrence date
    const firstOccurrence = new Date(startDate);
    firstOccurrence.setDate(startDate.getDate() + (firstSession.day - 1));

    // Set time based on day of week
    const hoursByDay = [9, 10, 14, 16, 18, 19, 20];
    firstOccurrence.setHours(hoursByDay[(firstSession.day - 1) % hoursByDay.length], 0, 0, 0);

    const endTime = new Date(firstOccurrence);
    endTime.setMinutes(endTime.getMinutes() + (firstSession.duration || 60));

    // Calculate end date (last occurrence)
    const endDate = new Date(firstOccurrence);
    endDate.setDate(endDate.getDate() + (totalWeeks - 1) * 7);

    const event = new Event({
      title: `${planData.name} - ${firstSession.focus}`,
      description: `Intensity: ${firstSession.intensity}\nPoses: ${firstSession.poses?.join(', ') || 'Various poses'}\n\nThis is a recurring ${totalWeeks}-week program with ${sessions.length} sessions.`,
      start: firstOccurrence,
      end: endTime,
      type: 'class',
      category: planData.formData?.experience || 'beginner',
      level: planData.formData?.experience || 'beginner',
      instructor: 'AI Generated',
      maxParticipants: 15,
      participants: [],
      color: getColorForFocus(firstSession.focus),
      duration: `${firstSession.duration || 60} min`,
      location: 'Main Studio',
      status: 'scheduled',
      approvalStatus: 'pending_approval',
      isVisible: false,
      generatedFrom: 'yoga_plan',
      aiGenerated: true,
      planId: planId,
      planName: planData.name,
      planData: planData,
      sessionFocus: firstSession.focus,
      sessionIntensity: firstSession.intensity,
      sessionPoses: firstSession.poses,
      // Recurring event fields
      isRecurring: true,
      recurrencePattern: {
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [firstOccurrence.getDay()],
        endDate: endDate,
        occurrences: sessions.length,
        exceptions: []
      },
      tenantKey
    });

    await event.save();
    createdEvents.push(event);
  }

  return createdEvents;
}

// Helper to get color based on focus area
function getColorForFocus(focus) {
  const colors = {
    'flexibility': '#9B59B6',
    'strength': '#E74C3C',
    'balance': '#3498DB',
    'relaxation': '#00B4DB',
    'default': '#4A90A4'
  };
  return colors[focus] || colors.default;
}

module.exports = router;