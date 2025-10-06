const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');
const YogaPlan = require('../models/YogaPlan');

/**
 * @swagger
 * /api/yoga-plans:
 *   get:
 *     tags: [Yoga Plans]
 *     summary: Get all yoga plans
 *     description: Retrieve a list of all yoga plans
 *     responses:
 *       200:
 *         description: List of yoga plans
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 plans:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/YogaPlan'
 *                 total:
 *                   type: number
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const tenantKey = req.tenantKey || 'default';

    const filter = { tenantKey };
    if (status) {
      filter.status = status;
    }

    const plans = await YogaPlan.find(filter).sort({ createdAt: -1 });

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
 *     description: Retrieve a specific yoga plan by its ID
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/YogaPlan'
 *       404:
 *         description: Plan not found
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const plan = await YogaPlan.findOne({ _id: req.params.id, tenantKey });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

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
 *     description: Retrieve all yoga plans for a specific user
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
 *                   items:
 *                     $ref: '#/components/schemas/YogaPlan'
 *                 total:
 *                   type: number
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const userPlans = await YogaPlan.find({
      userId: req.params.userId,
      tenantKey
    }).sort({ createdAt: -1 });

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

    // Generate a structured plan
    const newPlan = new YogaPlan({
      userId,
      formData,
      name: `Personalized ${formData.experience || 'Beginner'} Yoga Plan`,
      duration: '4 weeks',
      difficulty: formData.experience || 'beginner',
      sessions: generateDetailedSessions(formData),
      status: 'pending_approval',
      aiGenerated: true,
      requiresApproval: true,
      tenantKey
    });

    await newPlan.save();

    // Notify admin about new plan pending approval
    console.log(`New plan ${newPlan._id} pending approval for user ${userId}`);

    // Automatically create events from the plan with pending approval status
    try {
      const eventsCreated = await createEventsFromPlan(newPlan, tenantKey);
      console.log(`Created ${eventsCreated.length} recurring events from new plan ${newPlan._id} - awaiting approval`);

      res.json({
        message: 'Plan generated successfully and sent for approval',
        plan: newPlan,
        eventsCreated: eventsCreated.length
      });
    } catch (eventError) {
      console.error('Error creating events from plan:', eventError);
      // Still return success for plan, but note event creation failed
      res.json({
        message: 'Plan generated but failed to create events',
        plan: newPlan,
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

    // Generate a structured plan
    const newPlan = new YogaPlan({
      userId,
      formData,
      name: `Personalized ${formData.experience} Yoga Plan`,
      duration: '4 weeks',
      difficulty: formData.experience || 'beginner',
      sessions: generateDetailedSessions(formData),
      status: 'pending_approval',
      aiGenerated: true,
      requiresApproval: true,
      tenantKey
    });

    await newPlan.save();

    // Automatically create events from the plan with pending approval status
    try {
      const eventsCreated = await createEventsFromPlan(newPlan, tenantKey);
      console.log(`Created ${eventsCreated.length} events from new plan ${newPlan._id} - awaiting approval`);

      res.json({
        success: true,
        message: 'Plan generated successfully and events created (pending approval)',
        plan: newPlan,
        eventsCreated: eventsCreated.length
      });
    } catch (error) {
      console.error('Error creating events from plan:', error);
      res.json({
        success: true,
        message: 'Plan generated but failed to create events',
        plan: newPlan,
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

// Approve/reject plan (this just updates plan status, events are already created)
router.put('/:id/approve', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const plan = await YogaPlan.findOne({ _id: req.params.id, tenantKey });

    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    plan.status = req.body.approved ? 'approved' : 'rejected';
    plan.reviewedAt = new Date();
    plan.reviewedBy = req.body.reviewerId || 'instructor-1';
    plan.reviewNotes = req.body.notes || '';
    plan.rejectionReason = req.body.reason || '';

    await plan.save();

    res.json({
      message: `Plan ${plan.status}`,
      plan
    });
  } catch (error) {
    console.error('Error updating plan approval:', error);
    res.status(500).json({ error: 'Failed to update plan approval' });
  }
});

// Helper function to create events from approved plan
async function createEventsFromPlan(plan, tenantKey) {
  const Event = require('../models/Event');
  const createdEvents = [];

  // Calculate start date (next Monday)
  const today = new Date();
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntilMonday);
  startDate.setHours(9, 0, 0, 0); // Default to 9 AM

  // Group sessions by day and focus to create recurring events
  const sessionsByDayFocus = {};

  plan.sessions.forEach(session => {
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
      title: `${plan.name} - ${firstSession.focus}`,
      description: `Intensity: ${firstSession.intensity}\nPoses: ${firstSession.poses?.join(', ') || 'Various poses'}\n\nThis is a recurring ${totalWeeks}-week program with ${sessions.length} sessions.`,
      start: firstOccurrence,
      end: endTime,
      type: 'class',
      category: plan.formData?.experience || 'beginner',
      level: plan.formData?.experience || 'beginner',
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
      planId: plan._id.toString(),
      planName: plan.name,
      planData: plan.toObject(),
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