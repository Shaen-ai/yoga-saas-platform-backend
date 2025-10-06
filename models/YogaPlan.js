const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  week: Number,
  day: Number,
  duration: Number,
  poses: [String],
  focus: String,
  intensity: String
}, { _id: false });

const yogaPlanSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: String,
  userEmail: String,
  formData: {
    experience: String,
    goals: [String],
    healthIssues: String,
    availableTime: Number,
    frequency: Number,
    preferences: String
  },
  name: {
    type: String,
    required: true
  },
  duration: String,
  difficulty: String,
  sessions: [sessionSchema],
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected', 'active', 'completed'],
    default: 'pending_approval'
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  reviewedAt: Date,
  reviewedBy: String,
  reviewNotes: String,
  rejectionReason: String,
  tenantKey: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
yogaPlanSchema.index({ tenantKey: 1, status: 1 });
yogaPlanSchema.index({ tenantKey: 1, userId: 1 });

const YogaPlan = mongoose.model('YogaPlan', yogaPlanSchema);

module.exports = YogaPlan;
