const express = require('express');
const router = express.Router();

// Mock users data
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'member' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'instructor' },
  { id: '3', name: 'Admin User', email: 'admin@example.com', role: 'admin' }
];

// Get all users
router.get('/', (req, res) => {
  res.json({
    users: mockUsers,
    total: mockUsers.length
  });
});

// Get user by ID
router.get('/:id', (req, res) => {
  const user = mockUsers.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// Update user
router.put('/:id', (req, res) => {
  const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  mockUsers[userIndex] = { ...mockUsers[userIndex], ...req.body };
  res.json({
    message: 'User updated successfully',
    user: mockUsers[userIndex]
  });
});

// Delete user
router.delete('/:id', (req, res) => {
  const userIndex = mockUsers.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  mockUsers.splice(userIndex, 1);
  res.json({ message: 'User deleted successfully' });
});

module.exports = router;
module.exports.mockUsers = mockUsers;