const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['class', 'workshop', 'retreat', 'private'],
    default: 'class'
  },
  category: String,
  level: String,
  instructor: String,
  maxParticipants: {
    type: Number,
    default: 20
  },
  participants: [{
    userId: String,
    name: String,
    email: String,
    registeredAt: Date
  }],
  color: {
    type: String,
    default: '#4A90A4'
  },
  duration: String,
  location: String,
  status: {
    type: String,
    enum: ['scheduled', 'cancelled', 'completed'],
    default: 'scheduled'
  },
  approvalStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'approved'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  generatedFrom: String,
  planId: String,
  planName: String,
  planData: mongoose.Schema.Types.Mixed,
  sessionWeek: Number,
  sessionDay: Number,
  sessionFocus: String,
  sessionIntensity: String,
  sessionPoses: [String],
  // Recurring event fields
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
      default: 'weekly'
    },
    interval: {
      type: Number,
      default: 1
    },
    daysOfWeek: [Number], // 0-6 for Sunday-Saturday
    endDate: Date,
    occurrences: Number, // Total number of occurrences
    exceptions: [Date] // Dates to skip
  },
  createdBy: String,
  approvedBy: String,
  approvedAt: Date,
  approvalNotes: String,
  rejectedBy: String,
  rejectedAt: Date,
  rejectionReason: String,
  visibilityUpdatedAt: Date,
  visibilityUpdatedBy: String,
  tenantKey: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Index for efficient tenant-based queries
eventSchema.index({ tenantKey: 1, start: -1 });
eventSchema.index({ tenantKey: 1, approvalStatus: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
