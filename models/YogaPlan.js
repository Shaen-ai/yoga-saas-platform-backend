const mongoose = require('mongoose');

const yogaPlanSchema = new mongoose.Schema({
  tenantKey: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    required: true
  },
  category: {
    type: String,
    enum: ['hatha', 'vinyasa', 'yin', 'restorative', 'power', 'meditation'],
    required: true
  },
  poses: [{
    name: String,
    duration: Number,
    instructions: String
  }],
  benefits: [String],
  equipment: [String],
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [String],
  // Wix instance identification
  instanceId: {
    type: String,
    index: true
  },
  compId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Index for tenant isolation
yogaPlanSchema.index({ tenantKey: 1 });
yogaPlanSchema.index({ tenantKey: 1, level: 1 });
yogaPlanSchema.index({ tenantKey: 1, category: 1 });

module.exports = mongoose.model('YogaPlan', yogaPlanSchema);
