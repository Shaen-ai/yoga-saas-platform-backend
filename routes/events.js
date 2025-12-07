const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');
const { optionalWixAuth } = require('../middleware/wixSdkAuth');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Settings = require('../models/Settings');
const { sendRegistrationEmails } = require('../utils/emailService');

// In-memory storage for events when database is not available
const eventsStore = new Map();

// Get all events
router.get('/', optionalWixAuth, async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instanceId = req.wix?.instanceId;
    const compId = req.wix?.compId;

    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('GET /events - Database not connected, using in-memory storage');
      const events = eventsStore.get(tenantKey) || [];
      return res.json({
        events: events.sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
        total: events.length
      });
    }

    // Build query - filter by instanceId and compId if available
    const query = { tenantKey };
    if (instanceId) query.instanceId = instanceId;
    if (compId) query.compId = compId;

    const events = await Event.find(query).sort({ start: -1 });

    // Populate each event with confirmed registrations only
    const eventsWithRegistrations = await Promise.all(events.map(async (event) => {
      const confirmedRegistrations = await Registration.find({
        eventId: event._id,
        tenantKey,
        paymentCompleted: true,
        status: 'confirmed'
      }).select('name email phone registeredAt paymentConfirmedAt paymentAmount');

      const eventObj = event.toObject();

      // Replace participants with confirmed registrations
      eventObj.participants = confirmedRegistrations.map(reg => ({
        userId: reg._id,
        name: reg.name,
        email: reg.email,
        phone: reg.phone,
        registeredAt: reg.registeredAt,
        paymentStatus: 'paid',
        paymentAmount: reg.paymentAmount,
        paidAt: reg.paymentConfirmedAt
      }));

      // Update participant count
      eventObj.confirmedCount = confirmedRegistrations.length;
      eventObj.availableSpots = eventObj.maxParticipants - confirmedRegistrations.length;

      return eventObj;
    }));

    res.json({
      events: eventsWithRegistrations,
      total: eventsWithRegistrations.length
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Create new event
router.post('/', optionalWixAuth, async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instanceId = req.wix?.instanceId;
    const compId = req.wix?.compId;

    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('POST /events - Database not connected, using in-memory storage');

      // Create event in memory
      const events = eventsStore.get(tenantKey) || [];
      const newEvent = {
        _id: `event-${Date.now()}`,
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
        approvalStatus: req.body.approvalStatus || 'approved',
        isVisible: req.body.isVisible !== undefined ? req.body.isVisible : true,
        aiGenerated: req.body.aiGenerated || false,
        tenantKey,
        instanceId,
        compId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      events.push(newEvent);
      eventsStore.set(tenantKey, events);

      return res.status(201).json(newEvent);
    }

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
      approvalStatus: req.body.approvalStatus || 'approved',
      isVisible: req.body.isVisible !== undefined ? req.body.isVisible : true,
      aiGenerated: req.body.aiGenerated || false,
      tenantKey,
      instanceId,
      compId
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

    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('PUT /events/:id - Database not connected, using in-memory storage');

      const events = eventsStore.get(tenantKey) || [];
      const eventIndex = events.findIndex(e => e._id === req.params.id);

      if (eventIndex === -1) {
        return res.status(404).json({ error: 'Event not found' });
      }

      events[eventIndex] = {
        ...events[eventIndex],
        ...req.body,
        _id: events[eventIndex]._id,
        tenantKey,
        updatedAt: new Date()
      };

      eventsStore.set(tenantKey, events);
      return res.json(events[eventIndex]);
    }

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

    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('DELETE /events/:id - Database not connected, using in-memory storage');

      const events = eventsStore.get(tenantKey) || [];
      const eventIndex = events.findIndex(e => e._id === req.params.id);

      if (eventIndex === -1) {
        return res.status(404).json({ error: 'Event not found' });
      }

      events.splice(eventIndex, 1);
      eventsStore.set(tenantKey, events);
      return res.json({ message: 'Event deleted successfully' });
    }

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

// Get event registrations
router.get('/:id/registrations', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';

    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      console.log('GET /events/:id/registrations - Database not connected, using in-memory storage');

      const events = eventsStore.get(tenantKey) || [];
      const event = events.find(e => e._id === req.params.id);

      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }

      return res.json({
        registrations: event.participants || [],
        total: event.participants?.length || 0
      });
    }

    const event = await Event.findOne({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get only confirmed registrations
    const confirmedRegistrations = await Registration.find({
      eventId: req.params.id,
      tenantKey,
      paymentCompleted: true,
      status: 'confirmed'
    }).sort({ registeredAt: -1 });

    res.json({
      registrations: confirmedRegistrations,
      total: confirmedRegistrations.length
    });
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Register for event
router.post('/:id/register', optionalWixAuth, async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instanceId = req.wix?.instanceId;
    const compId = req.wix?.compId;

    // Check if database is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please try again later.' });
    }

    const event = await Event.findOne({ _id: req.params.id, tenantKey });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Count confirmed registrations only
    const confirmedCount = await Registration.countDocuments({
      eventId: req.params.id,
      tenantKey,
      paymentCompleted: true,
      status: 'confirmed'
    });

    if (confirmedCount >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Check if user already registered
    const existingRegistration = await Registration.findOne({
      eventId: req.params.id,
      email: req.body.email,
      tenantKey,
      status: { $in: ['pending_payment', 'confirmed'] }
    });

    if (existingRegistration) {
      return res.status(400).json({ error: 'You are already registered for this event' });
    }

    // Determine payment status
    const requiresPayment = event.requiresPayment || false;
    const paymentCompleted = !requiresPayment; // Free events are auto-confirmed
    const status = paymentCompleted ? 'confirmed' : 'pending_payment';

    // Create registration record
    const registration = new Registration({
      eventId: req.params.id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      experience: req.body.experience,
      specialRequirements: req.body.specialRequirements,
      emergencyContact: req.body.emergencyContact,
      paymentCompleted,
      paymentMethod: requiresPayment ? (event.paymentMethod || 'paypal') : 'free',
      paymentAmount: requiresPayment ? event.price : 0,
      paymentCurrency: event.currency || 'USD',
      status,
      tenantKey,
      instanceId,
      compId
    });

    await registration.save();

    console.log(`Registration created: ${registration._id}, Status: ${status}, Payment Required: ${requiresPayment}`);

    // Send confirmation emails
    try {
      // Get admin email from settings
      let adminEmail = null;
      const settings = await Settings.findOne({ tenantKey });
      if (settings && settings.general && settings.general.email) {
        adminEmail = settings.general.email;
      }

      // Prepare email data
      const registrationData = {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        experience: req.body.experience,
        specialRequirements: req.body.specialRequirements,
        emergencyContact: req.body.emergencyContact
      };

      const eventData = {
        title: event.title,
        start: event.start,
        end: event.end,
        instructor: event.instructor,
        location: event.location,
        requiresPayment: event.requiresPayment,
        price: event.price,
        currency: event.currency
      };

      // Send emails (async, don't wait)
      sendRegistrationEmails(registrationData, eventData, adminEmail)
        .then(results => {
          console.log('📧 Email sending results:', results);
        })
        .catch(error => {
          console.error('📧 Email sending failed:', error);
        });

    } catch (emailError) {
      // Log error but don't fail the registration
      console.error('Error sending emails:', emailError);
    }

    res.status(201).json({
      message: requiresPayment
        ? 'Registration pending payment confirmation'
        : 'Successfully registered for event',
      registration: {
        id: registration._id,
        eventId: registration.eventId,
        name: registration.name,
        email: registration.email,
        status: registration.status,
        paymentCompleted: registration.paymentCompleted,
        requiresPayment
      }
    });
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