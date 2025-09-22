const express = require('express');
const router = express.Router();

// Mock reviews data
const mockReviews = [
  {
    id: 'review-1',
    userId: 'user-1',
    targetType: 'instructor',
    targetId: 'inst-1',
    rating: 5,
    title: 'Amazing instructor!',
    comment: 'Sarah is incredibly knowledgeable and makes every class enjoyable. Her attention to alignment and modifications for different levels is outstanding.',
    helpful: 12,
    notHelpful: 0,
    verified: true,
    classAttended: 'Vinyasa Flow',
    createdAt: new Date('2025-09-15T10:00:00'),
    userName: 'Emily Johnson',
    response: {
      from: 'Sarah Johnson',
      message: 'Thank you so much for your kind words! Looking forward to our next class together.',
      date: new Date('2025-09-16T08:00:00')
    }
  },
  {
    id: 'review-2',
    userId: 'user-2',
    targetType: 'class',
    targetId: 'class-power-yoga',
    rating: 4,
    title: 'Great workout!',
    comment: 'Power yoga with Michael is intense but rewarding. Perfect for building strength and flexibility.',
    helpful: 8,
    notHelpful: 1,
    verified: true,
    classAttended: 'Power Yoga',
    createdAt: new Date('2025-09-10T14:30:00'),
    userName: 'David Miller'
  },
  {
    id: 'review-3',
    userId: 'user-3',
    targetType: 'studio',
    targetId: 'studio-main',
    rating: 4.5,
    title: 'Excellent facilities and instructors',
    comment: 'The studio is always clean, well-maintained, and has a peaceful atmosphere. The variety of classes and quality of instructors is impressive.',
    helpful: 25,
    notHelpful: 2,
    verified: true,
    memberSince: new Date('2024-06-15'),
    createdAt: new Date('2025-09-05T09:00:00'),
    userName: 'Jessica Chen',
    aspects: {
      cleanliness: 5,
      instructors: 5,
      facilities: 4,
      value: 4,
      atmosphere: 5
    }
  }
];

/**
 * @swagger
 * /api/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Get all reviews
 *     description: Retrieve all reviews with optional filtering
 *     parameters:
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *           enum: [instructor, class, studio, plan]
 *       - in: query
 *         name: targetId
 *         schema:
 *           type: string
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 */
router.get('/', (req, res) => {
  const { targetType, targetId, rating, verified } = req.query;

  let filteredReviews = [...mockReviews];

  if (targetType) {
    filteredReviews = filteredReviews.filter(r => r.targetType === targetType);
  }

  if (targetId) {
    filteredReviews = filteredReviews.filter(r => r.targetId === targetId);
  }

  if (rating) {
    filteredReviews = filteredReviews.filter(r => r.rating >= parseInt(rating));
  }

  if (verified !== undefined) {
    filteredReviews = filteredReviews.filter(r => r.verified === (verified === 'true'));
  }

  // Calculate statistics
  const stats = calculateReviewStats(filteredReviews);

  res.json({
    reviews: filteredReviews,
    total: filteredReviews.length,
    stats
  });
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get review by ID
 */
router.get('/:id', (req, res) => {
  const review = mockReviews.find(r => r.id === req.params.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  res.json(review);
});

/**
 * @swagger
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create new review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - targetType
 *               - targetId
 *               - rating
 *               - comment
 */
router.post('/', (req, res) => {
  const { userId, targetType, targetId, rating, title, comment, classAttended } = req.body;

  // Validate rating
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  // Check for duplicate review
  const existingReview = mockReviews.find(r =>
    r.userId === userId &&
    r.targetType === targetType &&
    r.targetId === targetId
  );

  if (existingReview) {
    return res.status(400).json({ error: 'You have already reviewed this item' });
  }

  const newReview = {
    id: `review-${Date.now()}`,
    userId,
    targetType,
    targetId,
    rating,
    title,
    comment,
    helpful: 0,
    notHelpful: 0,
    verified: false, // Will be verified after attendance check
    classAttended,
    createdAt: new Date(),
    userName: 'Anonymous User' // In production, fetch from user service
  };

  mockReviews.push(newReview);

  // Send notification to target (instructor/studio)
  console.log(`📧 Notification: New ${rating}-star review for ${targetType} ${targetId}`);

  res.status(201).json({
    message: 'Review submitted successfully',
    review: newReview
  });
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   put:
 *     tags: [Reviews]
 *     summary: Update review
 */
router.put('/:id', (req, res) => {
  const index = mockReviews.findIndex(r => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const { rating, title, comment } = req.body;

  // Validate rating if provided
  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  mockReviews[index] = {
    ...mockReviews[index],
    rating: rating || mockReviews[index].rating,
    title: title || mockReviews[index].title,
    comment: comment || mockReviews[index].comment,
    editedAt: new Date()
  };

  res.json({
    message: 'Review updated successfully',
    review: mockReviews[index]
  });
});

/**
 * @swagger
 * /api/reviews/{id}:
 *   delete:
 *     tags: [Reviews]
 *     summary: Delete review
 */
router.delete('/:id', (req, res) => {
  const index = mockReviews.findIndex(r => r.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const deletedReview = mockReviews.splice(index, 1)[0];

  res.json({
    message: 'Review deleted successfully',
    review: deletedReview
  });
});

/**
 * @swagger
 * /api/reviews/{id}/helpful:
 *   post:
 *     tags: [Reviews]
 *     summary: Mark review as helpful
 */
router.post('/:id/helpful', (req, res) => {
  const review = mockReviews.find(r => r.id === req.params.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  review.helpful += 1;

  res.json({
    message: 'Review marked as helpful',
    helpfulCount: review.helpful
  });
});

/**
 * @swagger
 * /api/reviews/{id}/not-helpful:
 *   post:
 *     tags: [Reviews]
 *     summary: Mark review as not helpful
 */
router.post('/:id/not-helpful', (req, res) => {
  const review = mockReviews.find(r => r.id === req.params.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  review.notHelpful += 1;

  res.json({
    message: 'Review marked as not helpful',
    notHelpfulCount: review.notHelpful
  });
});

/**
 * @swagger
 * /api/reviews/{id}/respond:
 *   post:
 *     tags: [Reviews]
 *     summary: Respond to a review (instructor/admin only)
 */
router.post('/:id/respond', (req, res) => {
  const review = mockReviews.find(r => r.id === req.params.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const { from, message } = req.body;

  review.response = {
    from,
    message,
    date: new Date()
  };

  res.json({
    message: 'Response added successfully',
    review
  });
});

/**
 * @swagger
 * /api/reviews/{id}/verify:
 *   post:
 *     tags: [Reviews]
 *     summary: Verify review (admin only)
 */
router.post('/:id/verify', (req, res) => {
  const review = mockReviews.find(r => r.id === req.params.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  review.verified = true;
  review.verifiedAt = new Date();

  res.json({
    message: 'Review verified successfully',
    review
  });
});

/**
 * @swagger
 * /api/reviews/{id}/flag:
 *   post:
 *     tags: [Reviews]
 *     summary: Flag inappropriate review
 */
router.post('/:id/flag', (req, res) => {
  const review = mockReviews.find(r => r.id === req.params.id);

  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }

  const { reason, details } = req.body;

  review.flagged = {
    reason,
    details,
    flaggedAt: new Date(),
    flaggedBy: req.headers['x-user-id'] || 'anonymous'
  };

  // Notify admin
  console.log(`🚩 Review ${review.id} flagged for: ${reason}`);

  res.json({
    message: 'Review flagged for review',
    reviewId: review.id
  });
});

/**
 * @swagger
 * /api/reviews/stats/{targetType}/{targetId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Get review statistics for a target
 */
router.get('/stats/:targetType/:targetId', (req, res) => {
  const { targetType, targetId } = req.params;

  const targetReviews = mockReviews.filter(r =>
    r.targetType === targetType && r.targetId === targetId
  );

  if (targetReviews.length === 0) {
    return res.json({
      targetType,
      targetId,
      totalReviews: 0,
      averageRating: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedPercentage: 0,
      recentReviews: []
    });
  }

  const stats = calculateReviewStats(targetReviews);
  const recentReviews = targetReviews
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  res.json({
    targetType,
    targetId,
    ...stats,
    recentReviews
  });
});

/**
 * @swagger
 * /api/reviews/summary:
 *   get:
 *     tags: [Reviews]
 *     summary: Get overall review summary
 */
router.get('/summary', (req, res) => {
  const summary = {
    totalReviews: mockReviews.length,
    averageRating: calculateAverageRating(mockReviews),
    byType: {
      instructor: mockReviews.filter(r => r.targetType === 'instructor').length,
      class: mockReviews.filter(r => r.targetType === 'class').length,
      studio: mockReviews.filter(r => r.targetType === 'studio').length,
      plan: mockReviews.filter(r => r.targetType === 'plan').length
    },
    recentActivity: {
      lastWeek: mockReviews.filter(r => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(r.createdAt) > weekAgo;
      }).length,
      lastMonth: mockReviews.filter(r => {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(r.createdAt) > monthAgo;
      }).length
    },
    topRated: getTopRated(),
    needsAttention: mockReviews.filter(r => r.rating <= 2 && !r.response).length
  };

  res.json(summary);
});

// Helper functions
function calculateReviewStats(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      verifiedPercentage: 0
    };
  }

  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRating = 0;
  let verifiedCount = 0;

  reviews.forEach(review => {
    totalRating += review.rating;
    distribution[Math.floor(review.rating)]++;
    if (review.verified) verifiedCount++;
  });

  return {
    totalReviews: reviews.length,
    averageRating: (totalRating / reviews.length).toFixed(1),
    distribution,
    verifiedPercentage: Math.round((verifiedCount / reviews.length) * 100)
  };
}

function calculateAverageRating(reviews) {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r) => sum + r.rating, 0);
  return (total / reviews.length).toFixed(1);
}

function getTopRated() {
  const instructorReviews = mockReviews.filter(r => r.targetType === 'instructor');
  const instructorStats = {};

  instructorReviews.forEach(review => {
    if (!instructorStats[review.targetId]) {
      instructorStats[review.targetId] = {
        id: review.targetId,
        ratings: [],
        total: 0
      };
    }
    instructorStats[review.targetId].ratings.push(review.rating);
    instructorStats[review.targetId].total++;
  });

  return Object.values(instructorStats)
    .map(stat => ({
      id: stat.id,
      averageRating: calculateAverageRating(stat.ratings.map(r => ({ rating: r }))),
      totalReviews: stat.total
    }))
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 3);
}

module.exports = router;