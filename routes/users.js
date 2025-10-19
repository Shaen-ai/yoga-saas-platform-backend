const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');

// In-memory storage for users per tenant (in production, this would be a database)
const usersStore = new Map();

// Get all users
router.get('/', (req, res) => {
  const { role } = req.query;
  const tenantKey = req.tenantKey || 'default';
  const users = usersStore.get(tenantKey) || [];

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

// Get user statistics (must come before /:id route)
router.get('/stats', (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const users = usersStore.get(tenantKey) || [];

    // Calculate stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const newThisMonth = users.filter(u => new Date(u.createdAt) >= startOfMonth).length;

    res.json({
      totalUsers,
      activeUsers,
      newThisMonth
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// Get user by ID
router.get('/:id', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const users = usersStore.get(tenantKey) || [];
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

  const tenantKey = req.tenantKey || 'default';
  const users = usersStore.get(tenantKey) || [];

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
    status: 'active',
    tenantKey
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
  usersStore.set(tenantKey, users);

  res.status(201).json({
    message: 'User created successfully',
    user: newUser
  });
});

// Update user
router.put('/:id', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const users = usersStore.get(tenantKey) || [];
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Preserve the ID, createdAt, and tenantKey
  const updatedUser = {
    ...users[userIndex],
    ...req.body,
    id: users[userIndex].id,
    createdAt: users[userIndex].createdAt,
    tenantKey,
    updatedAt: new Date()
  };

  users[userIndex] = updatedUser;
  usersStore.set(tenantKey, users);

  res.json({
    message: 'User updated successfully',
    user: users[userIndex]
  });
});

// Delete user
router.delete('/:id', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const users = usersStore.get(tenantKey) || [];
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  const deletedUser = users.splice(userIndex, 1)[0];
  usersStore.set(tenantKey, users);
  res.json({
    message: 'User deleted successfully',
    user: deletedUser
  });
});

module.exports = router;
module.exports.usersStore = usersStore;