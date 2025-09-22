const express = require('express');
const router = express.Router();
const { users } = require('./users');

/**
 * @swagger
 * /api/instructors:
 *   get:
 *     tags: [Instructors]
 *     summary: Get all instructors
 *     description: Retrieve a list of all yoga instructors
 *     responses:
 *       200:
 *         description: List of instructors
 */
router.get('/', (req, res) => {
  const { status, specialization } = req.query;

  // Filter users to get only instructors
  let instructors = users.filter(user => user.role === 'instructor');

  if (status) {
    instructors = instructors.filter(inst => inst.status === status);
  }

  if (specialization) {
    instructors = instructors.filter(inst =>
      inst.specializations && inst.specializations.includes(specialization)
    );
  }

  res.json({
    instructors,
    total: instructors.length
  });
});

/**
 * @swagger
 * /api/instructors/{id}:
 *   get:
 *     tags: [Instructors]
 *     summary: Get instructor by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:id', (req, res) => {
  const instructor = users.find(u => u.id === req.params.id && u.role === 'instructor');

  if (!instructor) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  res.json(instructor);
});

/**
 * @swagger
 * /api/instructors:
 *   post:
 *     tags: [Instructors]
 *     summary: Add new instructor
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
router.post('/', (req, res) => {
  const {
    name,
    email,
    phone,
    specializations,
    experience,
    certification,
    bio,
    availability
  } = req.body;

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Check if user with this email already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const newInstructor = {
    id: `inst-${Date.now()}`,
    name,
    email,
    phone: phone || '',
    role: 'instructor',
    specializations: specializations || [],
    experience: experience || 0,
    certification: certification || [],
    bio: bio || '',
    availability: availability || {},
    status: 'pending',
    joinedAt: new Date(),
    createdAt: new Date(),
    totalClasses: 0,
    activeStudents: 0,
    rating: 0,
    profileImage: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
  };

  // Add to users array
  users.push(newInstructor);

  res.status(201).json({
    message: 'Instructor added successfully',
    instructor: newInstructor
  });
});

/**
 * @swagger
 * /api/instructors/{id}:
 *   put:
 *     tags: [Instructors]
 *     summary: Update instructor
 */
router.put('/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id && u.role === 'instructor');

  if (index === -1) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  users[index] = {
    ...users[index],
    ...req.body,
    id: req.params.id, // Preserve ID
    role: 'instructor', // Preserve role
    createdAt: users[index].createdAt, // Preserve creation date
    updatedAt: new Date()
  };

  res.json({
    message: 'Instructor updated successfully',
    instructor: users[index]
  });
});

/**
 * @swagger
 * /api/instructors/{id}:
 *   delete:
 *     tags: [Instructors]
 *     summary: Delete instructor
 */
router.delete('/:id', (req, res) => {
  const index = users.findIndex(u => u.id === req.params.id && u.role === 'instructor');

  if (index === -1) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  const deletedInstructor = users.splice(index, 1)[0];

  res.json({
    message: 'Instructor deleted successfully',
    instructor: deletedInstructor
  });
});

/**
 * @swagger
 * /api/instructors/{id}/schedule:
 *   get:
 *     tags: [Instructors]
 *     summary: Get instructor schedule
 */
router.get('/:id/schedule', (req, res) => {
  const instructor = users.find(u => u.id === req.params.id && u.role === 'instructor');

  if (!instructor) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  // Generate mock schedule for the week
  const schedule = {
    instructorId: instructor.id,
    instructorName: instructor.name,
    week: getCurrentWeekDates(),
    classes: generateWeeklyClasses(instructor)
  };

  res.json(schedule);
});

/**
 * @swagger
 * /api/instructors/{id}/stats:
 *   get:
 *     tags: [Instructors]
 *     summary: Get instructor statistics
 */
router.get('/:id/stats', (req, res) => {
  const instructor = users.find(u => u.id === req.params.id && u.role === 'instructor');

  if (!instructor) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  const stats = {
    instructorId: instructor.id,
    totalClasses: instructor.totalClasses || 0,
    activeStudents: instructor.activeStudents || 0,
    rating: instructor.rating || 0,
    monthlyClasses: Math.floor((instructor.totalClasses || 0) / 12),
    attendanceRate: 85 + Math.random() * 15, // 85-100%
    studentSatisfaction: (instructor.rating || 0) * 20, // Convert to percentage
    specializations: instructor.specializations || [],
    topPerformingClass: instructor.specializations ? instructor.specializations[0] : 'General',
    revenueGenerated: (instructor.totalClasses || 0) * 45 // Assuming $45 per class
  };

  res.json(stats);
});

/**
 * @swagger
 * /api/instructors/{id}/reviews:
 *   get:
 *     tags: [Instructors]
 *     summary: Get instructor reviews
 */
router.get('/:id/reviews', (req, res) => {
  const instructor = users.find(u => u.id === req.params.id && u.role === 'instructor');

  if (!instructor) {
    return res.status(404).json({ error: 'Instructor not found' });
  }

  // Mock reviews for now (in production, these would come from a reviews collection)
  const reviews = [];

  if (instructor.rating > 0) {
    reviews.push({
      id: `review-${instructor.id}-1`,
      studentName: 'Student User',
      rating: instructor.rating,
      comment: 'Great instructor!',
      classType: instructor.specializations ? instructor.specializations[0] : 'General',
      date: new Date()
    });
  }

  res.json({
    reviews,
    averageRating: instructor.rating || 0,
    totalReviews: reviews.length
  });
});

/**
 * @swagger
 * /api/instructors/specializations:
 *   get:
 *     tags: [Instructors]
 *     summary: Get all unique specializations
 */
router.get('/specializations/list', (req, res) => {
  const instructors = users.filter(u => u.role === 'instructor');
  const specializations = new Set();

  instructors.forEach(inst => {
    if (inst.specializations && Array.isArray(inst.specializations)) {
      inst.specializations.forEach(spec => specializations.add(spec));
    }
  });

  res.json({
    specializations: Array.from(specializations),
    total: specializations.size
  });
});

// Helper functions
function getCurrentWeekDates() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

function generateWeeklyClasses(instructor) {
  const classes = [];
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const weekDates = getCurrentWeekDates();

  if (!instructor.availability) {
    return classes;
  }

  days.forEach((day, index) => {
    const dayAvailability = instructor.availability[day];
    if (dayAvailability && dayAvailability.length > 0) {
      dayAvailability.forEach(timeSlot => {
        const [start, end] = timeSlot.split('-');
        classes.push({
          id: `class-${instructor.id}-${day}-${start}`,
          instructorId: instructor.id,
          date: weekDates[index],
          day: day,
          startTime: start,
          endTime: end,
          type: instructor.specializations && instructor.specializations.length > 0
            ? instructor.specializations[Math.floor(Math.random() * instructor.specializations.length)]
            : 'General Yoga',
          level: ['beginner', 'intermediate', 'advanced'][Math.floor(Math.random() * 3)],
          capacity: 20,
          enrolled: Math.floor(Math.random() * 18) + 2,
          status: 'scheduled'
        });
      });
    }
  });

  return classes;
}

module.exports = router;