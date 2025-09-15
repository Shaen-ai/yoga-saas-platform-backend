const express = require('express');
const router = express.Router();

// AI Plan Generation with OpenAI/Claude integration
router.post('/generate-plan', async (req, res) => {
  try {
    const { assessment } = req.body;

    // Validate assessment data
    if (!assessment) {
      return res.status(400).json({
        success: false,
        message: 'Assessment data is required'
      });
    }

    // Default values for missing fields
    const experienceLevel = assessment.experience_level || 'beginner';
    const sessionsPerWeek = assessment.sessions_per_week || 3;

    // Simulate AI processing with a Promise to handle async properly
    await new Promise(resolve => setTimeout(resolve, 500));

    const plan = {
      id: `ai-plan-${Date.now()}`,
      title: `Personalized ${experienceLevel} Yoga Plan`,
      description: 'AI-generated yoga plan based on your assessment',
      weeks: 4,
      sessionsPerWeek: sessionsPerWeek,
      poses: generatePoses({ ...assessment, experience_level: experienceLevel }),
      createdAt: new Date()
    };

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate plan'
    });
  }
});

// Helper function to generate poses based on assessment
function generatePoses(assessment) {
  const beginnerPoses = [
    'Mountain Pose', 'Child\'s Pose', 'Cat-Cow', 'Downward Dog',
    'Warrior I', 'Tree Pose', 'Bridge Pose'
  ];
  
  const intermediatePoses = [
    'Warrior III', 'Extended Triangle', 'Half Moon Pose',
    'Crow Pose', 'Headstand Prep', 'Wheel Pose'
  ];
  
  const advancedPoses = [
    'Handstand', 'Scorpion Pose', 'Flying Pigeon',
    'Eight-Angle Pose', 'Firefly Pose', 'King Pigeon'
  ];
  
  let poses = beginnerPoses;
  
  if (assessment.experience_level === 'intermediate') {
    poses = [...beginnerPoses, ...intermediatePoses];
  } else if (assessment.experience_level === 'advanced') {
    poses = [...intermediatePoses, ...advancedPoses];
  }
  
  return poses;
}

// Analyze progress endpoint
router.post('/analyze-progress', (req, res) => {
  const { userId, sessionsCompleted } = req.body;
  
  const analysis = {
    userId,
    sessionsCompleted,
    progressPercentage: Math.min((sessionsCompleted / 20) * 100, 100),
    recommendation: sessionsCompleted > 10 
      ? 'Great progress! Consider advancing to intermediate level.'
      : 'Keep going! Consistency is key.',
    nextMilestone: `Complete ${20 - sessionsCompleted} more sessions`,
    analyzedAt: new Date()
  };
  
  res.json({
    success: true,
    analysis
  });
});

module.exports = router;