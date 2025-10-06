const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');
const Event = require('../models/Event');

// Get all events
router.get('/', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const events = await Event.find({ tenantKey }).sort({ start: -1 });
    res.json({
      events,
      total: events.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new event
router.post('/', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = new Event({
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
      tenantKey
    });

    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event
router.put('/:id', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, tenantKey },
      { ...req.body, tenantKey },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = await Event.findOneAndDelete({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// Register for event
router.post('/:id/register', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = await Event.findOne({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.participants.length >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    event.participants.push({
      userId: req.body.userId,
      name: req.body.name,
      email: req.body.email,
      registeredAt: new Date()
    });

    await event.save();
    res.json({ message: 'Successfully registered for event', event });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// Approve AI-generated event
router.put('/:id/approve', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = await Event.findOne({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.approvalStatus = 'approved';
    event.isVisible = true;  // Make visible when approved
    event.approvedBy = req.body.approvedBy || 'admin';
    event.approvedAt = new Date();
    event.approvalNotes = req.body.notes || '';

    await event.save();
    console.log(`Event ${event._id} approved by ${event.approvedBy}`);

    res.json({
      message: 'Event approved successfully',
      event
    });
  } catch (error) {
    console.error('Error approving event:', error);
    res.status(500).json({ error: 'Failed to approve event' });
  }
});

// Reject AI-generated event
router.put('/:id/reject', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = await Event.findOne({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.approvalStatus = 'rejected';
    event.isVisible = false;
    event.rejectedBy = req.body.rejectedBy || 'admin';
    event.rejectedAt = new Date();
    event.rejectionReason = req.body.reason || '';

    await event.save();
    console.log(`Event ${event._id} rejected by ${event.rejectedBy}: ${event.rejectionReason}`);

    res.json({
      message: 'Event rejected',
      event
    });
  } catch (error) {
    console.error('Error rejecting event:', error);
    res.status(500).json({ error: 'Failed to reject event' });
  }
});

// Toggle event visibility
router.put('/:id/visibility', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const event = await Event.findOne({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.isVisible = req.body.isVisible;
    event.visibilityUpdatedAt = new Date();
    event.visibilityUpdatedBy = req.body.updatedBy || 'admin';

    await event.save();
    console.log(`Event ${event._id} visibility set to ${event.isVisible}`);

    res.json({
      message: `Event ${event.isVisible ? 'shown' : 'hidden'}`,
      event
    });
  } catch (error) {
    console.error('Error toggling visibility:', error);
    res.status(500).json({ error: 'Failed to toggle visibility' });
  }
});

module.exports = router;