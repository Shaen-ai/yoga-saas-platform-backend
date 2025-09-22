const express = require('express');
const router = express.Router();

// In-memory storage for users (in production, this would be a database)
let users = [];

// Get all users
router.get('/', (req, res) => {
  const { role } = req.query;

  let filteredUsers = [...users];

  // Filter by role if provided
  if (role) {
    filteredUsers = filteredUsers.filter(user => user.role === role);
  }

  res.json({
    users: filteredUsers,
    total: filteredUsers.length
  });
});

// Get user by ID
router.get('/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Create new user (instructor or member)
router.post('/', (req, res) => {
  const { name, email, role, phone, bio, specializations, experience, certification } = req.body;

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Check if user with this email already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  // Create new user object based on role
  const newUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    role: role || 'member',
    phone: phone || '',
    bio: bio || '',
    createdAt: new Date(),
    status: 'active'
  };

  // Add instructor-specific fields if role is instructor
  if (role === 'instructor') {
    newUser.specializations = specializations || [];
    newUser.experience = experience || 0;
    newUser.certification = certification || [];
    newUser.rating = 0;
    newUser.totalClasses = 0;
    newUser.activeStudents = 0;
    newUser.availability = {};
  }

  users.push(newUser);

  res.status(201).json({
    message: 'User created successfully',
    user: newUser
  });
});

// Update user
router.put('/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Preserve the ID and createdAt
  const updatedUser = {
    ...users[userIndex],
    ...req.body,
    id: users[userIndex].id,
    createdAt: users[userIndex].createdAt,
    updatedAt: new Date()
  };

  users[userIndex] = updatedUser;

  res.json({
    message: 'User updated successfully',
    user: users[userIndex]
  });
});

// Delete user
router.delete('/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = users.splice(userIndex, 1)[0];
  res.json({
    message: 'User deleted successfully',
    user: deletedUser
  });
});

// Get user statistics
router.get('/stats/overview', (req, res) => {
  const stats = {
    totalUsers: users.length,
    members: users.filter(u => u.role === 'member').length,
    instructors: users.filter(u => u.role === 'instructor').length,
    admins: users.filter(u => u.role === 'admin').length,
    activeUsers: users.filter(u => u.status === 'active').length,
    newThisMonth: users.filter(u => {
      const userDate = new Date(u.createdAt);
      const now = new Date();
      return userDate.getMonth() === now.getMonth() &&
             userDate.getFullYear() === now.getFullYear();
    }).length
  };

  res.json(stats);
});

// Search users
router.get('/search/:query', (req, res) => {
  const query = req.params.query.toLowerCase();
  const searchResults = users.filter(u =>
    u.name.toLowerCase().includes(query) ||
    u.email.toLowerCase().includes(query) ||
    (u.bio && u.bio.toLowerCase().includes(query))
  );

  res.json({
    users: searchResults,
    total: searchResults.length
  });
});

module.exports = router;
module.exports.users = users;