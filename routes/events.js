const express = require('express');
const router = express.Router();

// In-memory storage for events
const events = [];

// Get all events
router.get('/', (req, res) => {
  res.json({
    events,
    total: events.length
  });
});

// Create new event
router.post('/', (req, res) => {
  const event = {
    id: `event-${Date.now()}`,
    title: req.body.title,
    description: req.body.description,
    start: req.body.start,
    end: req.body.end,
    type: req.body.type || 'class',
    instructor: req.body.instructor,
    maxParticipants: req.body.maxParticipants || 20,
    participants: [],
    color: req.body.color || '#4A90A4',
    createdBy: req.body.createdBy || 'admin',
    createdAt: new Date()
  };
  
  events.push(event);
  res.status(201).json(event);
});

// Update event
router.put('/:id', (req, res) => {
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  events[index] = { ...events[index], ...req.body, updatedAt: new Date() };
  res.json(events[index]);
});

// Delete event
router.delete('/:id', (req, res) => {
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  events.splice(index, 1);
  res.json({ message: 'Event deleted successfully' });
});

// Register for event
router.post('/:id/register', (req, res) => {
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  if (event.participants.length >= event.maxParticipants) {
    return res.status(400).json({ error: 'Event is full' });
  }
  
  event.participants.push({
    userId: req.body.userId,
    name: req.body.name,
    registeredAt: new Date()
  });
  
  res.json({ message: 'Successfully registered for event', event });
});

module.exports = router;
module.exports.events = events;