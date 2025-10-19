const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');

// In-memory storage for instructors per tenant (in production, this would be a database)
const instructorsStore = new Map();

// Get all instructors
router.get('/', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];

    res.json({
      instructors,
      total: instructors.length
    });
  } catch (error) {
    console.error('Error fetching instructors:', error);
    res.status(500).json({ error: 'Failed to fetch instructors' });
  }
});

// Get instructor by ID
router.get('/:id', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];
    const instructor = instructors.find(i => i.id === req.params.id);

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    res.json(instructor);
  } catch (error) {
    console.error('Error fetching instructor:', error);
    res.status(500).json({ error: 'Failed to fetch instructor' });
  }
});

// Create new instructor
router.post('/', (req, res) => {
  try {
    const { name, email, phone, bio, specializations, experience, certification, profileImage } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];

    // Check if instructor with this email already exists
    const existingInstructor = instructors.find(i => i.email === email);
    if (existingInstructor) {
      return res.status(400).json({ error: 'Instructor with this email already exists' });
    }

    // Create new instructor object
    const newInstructor = {
      id: `instructor-${Date.now()}`,
      name,
      email,
      phone: phone || '',
      bio: bio || '',
      specializations: specializations || [],
      experience: experience || 0,
      certification: certification || [],
      profileImage: profileImage || '',
      rating: 0,
      totalClasses: 0,
      activeStudents: 0,
      availability: {},
      status: 'active',
      createdAt: new Date(),
      tenantKey
    };

    instructors.push(newInstructor);
    instructorsStore.set(tenantKey, instructors);

    res.status(201).json({
      message: 'Instructor created successfully',
      instructor: newInstructor
    });
  } catch (error) {
    console.error('Error creating instructor:', error);
    res.status(500).json({ error: 'Failed to create instructor' });
  }
});

// Update instructor
router.put('/:id', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];
    const instructorIndex = instructors.findIndex(i => i.id === req.params.id);

    if (instructorIndex === -1) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Preserve the ID, createdAt, and tenantKey
    const updatedInstructor = {
      ...instructors[instructorIndex],
      ...req.body,
      id: instructors[instructorIndex].id,
      createdAt: instructors[instructorIndex].createdAt,
      tenantKey,
      updatedAt: new Date()
    };

    instructors[instructorIndex] = updatedInstructor;
    instructorsStore.set(tenantKey, instructors);

    res.json({
      message: 'Instructor updated successfully',
      instructor: updatedInstructor
    });
  } catch (error) {
    console.error('Error updating instructor:', error);
    res.status(500).json({ error: 'Failed to update instructor' });
  }
});

// Get instructor schedule
router.get('/:id/schedule', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];
    const instructor = instructors.find(i => i.id === req.params.id);

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Return availability/schedule
    res.json({
      instructorId: instructor.id,
      instructorName: instructor.name,
      availability: instructor.availability || {},
      schedule: [] // Would fetch from events in production
    });
  } catch (error) {
    console.error('Error fetching instructor schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// Get instructor stats
router.get('/:id/stats', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];
    const instructor = instructors.find(i => i.id === req.params.id);

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    res.json({
      instructorId: instructor.id,
      instructorName: instructor.name,
      totalClasses: instructor.totalClasses || 0,
      activeStudents: instructor.activeStudents || 0,
      rating: instructor.rating || 0,
      totalReviews: 0,
      upcomingClasses: 0,
      completedClasses: instructor.totalClasses || 0
    });
  } catch (error) {
    console.error('Error fetching instructor stats:', error);
    res.status(500).json({ error: 'Failed to fetch instructor stats' });
  }
});

// Get instructor reviews
router.get('/:id/reviews', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instructors = instructorsStore.get(tenantKey) || [];
    const instructor = instructors.find(i => i.id === req.params.id);

    if (!instructor) {
      return res.status(404).json({ error: 'Instructor not found' });
    }

    // Return mock reviews (would fetch from database in production)
    res.json({
      reviews: [],
      averageRating: instructor.rating || 0,
      totalReviews: 0
    });
  } catch (error) {
    console.error('Error fetching instructor reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
module.exports.instructorsStore = instructorsStore;
