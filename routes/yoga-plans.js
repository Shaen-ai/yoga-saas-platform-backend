const express = require('express');
const router = express.Router();

// Mock yoga plans
const mockPlans = [
  {
    id: 'plan-1',
    userId: 'user-1',
    name: 'Beginner Morning Flow',
    duration: '4 weeks',
    difficulty: 'beginner',
    sessions: [
      { day: 1, poses: ['Mountain Pose', 'Downward Dog', 'Child\'s Pose'], duration: 15 },
      { day: 2, poses: ['Sun Salutation A', 'Warrior I', 'Tree Pose'], duration: 20 }
    ],
    status: 'active'
  },
  {
    id: 'plan-2',
    userId: 'user-2',
    name: 'Intermediate Strength Building',
    duration: '6 weeks',
    difficulty: 'intermediate',
    sessions: [
      { day: 1, poses: ['Plank', 'Chaturanga', 'Warrior III'], duration: 30 },
      { day: 2, poses: ['Crow Pose', 'Side Plank', 'Boat Pose'], duration: 35 }
    ],
    status: 'approved',
    reviewedAt: new Date('2025-09-14T18:30:46.037Z'),
    reviewedBy: 'admin'
  },
  {
    id: 'plan-3',
    userId: 'user-1',
    name: 'Advanced Power Flow',
    duration: '8 weeks',
    difficulty: 'advanced',
    sessions: [
      { day: 1, poses: ['Handstand', 'Scorpion Pose', 'Flying Pigeon'], duration: 45 },
      { day: 2, poses: ['Crow Pose', 'Eight-Angle Pose', 'Firefly'], duration: 50 }
    ],
    status: 'pending_approval',
    experience: 'advanced',
    goals: ['strength', 'flexibility', 'balance'],
    availableTime: 45,
    frequency: 4,
    createdAt: new Date()
  }
];

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
router.get('/', (req, res) => {
  const { status } = req.query;

  let filteredPlans = mockPlans;

  // Filter by status if provided
  if (status) {
    filteredPlans = mockPlans.filter(plan => plan.status === status);
  }

  res.json({
    plans: filteredPlans,
    total: filteredPlans.length
  });
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
router.get('/:id', (req, res) => {
  const plan = mockPlans.find(p => p.id === req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  res.json(plan);
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
router.get('/user/:userId', (req, res) => {
  const userPlans = mockPlans.filter(p => p.userId === req.params.userId);
  res.json({
    plans: userPlans,
    total: userPlans.length
  });
});

// Generate new plan with AI integration
router.post('/generate', async (req, res) => {
  const { userId, formData } = req.body;
  
  try {
    // Prepare prompt for AI
    const prompt = `Create a personalized yoga plan for:
    - Experience: ${formData.experience}
    - Goals: ${formData.goals}
    - Health Issues: ${formData.healthIssues || 'None'}
    - Available Time: ${formData.availableTime} minutes per session
    - Frequency: ${formData.frequency} times per week
    - Preferences: ${formData.preferences}`;
    
    // Here you would call OpenAI or Claude API
    // For now, generating a structured plan
    const newPlan = {
      id: `plan-${Date.now()}`,
      userId,
      formData,
      name: `Personalized ${formData.experience} Yoga Plan`,
      duration: '4 weeks',
      difficulty: formData.experience || 'beginner',
      sessions: generateDetailedSessions(formData),
      status: 'pending_approval',
      aiGenerated: true,
      createdAt: new Date(),
      requiresApproval: true
    };
    
    mockPlans.push(newPlan);
    
    // Notify admin about new plan pending approval
    console.log(`New plan ${newPlan.id} pending approval for user ${userId}`);
    
    res.json({
      message: 'Plan generated successfully and sent for approval',
      plan: newPlan
    });
  } catch (error) {
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

    // Generate a structured plan
    const newPlan = {
      id: `plan-${Date.now()}`,
      userId,
      formData,
      name: `Personalized ${formData.experience} Yoga Plan`,
      duration: '4 weeks',
      difficulty: formData.experience || 'beginner',
      sessions: generateDetailedSessions(formData),
      status: 'pending_approval',
      aiGenerated: true,
      createdAt: new Date(),
      requiresApproval: true
    };

    mockPlans.push(newPlan);

    res.json({
      success: true,
      message: 'Plan generated successfully',
      plan: newPlan
    });
  } catch (error) {
    console.error('Error in generate-ai:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate AI plan'
    });
  }
});

// Approve/reject plan
router.put('/:id/approve', (req, res) => {
  const plan = mockPlans.find(p => p.id === req.params.id);
  if (!plan) {
    return res.status(404).json({ error: 'Plan not found' });
  }
  
  plan.status = req.body.approved ? 'approved' : 'rejected';
  plan.reviewedAt = new Date();
  plan.reviewedBy = req.body.reviewerId || 'instructor-1';
  
  res.json({
    message: `Plan ${plan.status}`,
    plan
  });
});

module.exports = router;
module.exports.mockPlans = mockPlans;