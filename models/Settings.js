const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  tenantKey: {
    type: String,
    required: true,
    default: 'default',
    index: true
  },

  // Wix instance identification
  instanceId: {
    type: String,
    index: true
  },
  
  // Component ID - unique identifier for each widget instance
  // This is the PRIMARY key for differentiating settings between widgets
  compId: {
    type: String,
    index: true,
    sparse: true  // Allow null values but enforce uniqueness when present
  },

  // Widget name (user-defined)
  widgetName: {
    type: String,
    default: ''
  },

  // Premium plan from Wix
  premiumPlanName: {
    type: String,
    enum: ['free', 'light', 'business', 'business-pro', 'true'],
    default: 'free'
  },

  // General Studio Information
  general: {
    studioName: String,
    email: String,
    phone: String,
    address: String,
    timezone: String,
    language: String
  },

  // Notification Settings
  notifications: {
    emailNotifications: Boolean
  },

  // Business Settings
  business: {
    maxStudentsPerClass: Number,
    bookingWindow: Number,
    currency: String
  },

  // Only store values that differ from defaults
  appearance: {
    primaryColor: String,
    fontSize: String
  },

  layout: {
    defaultMode: String,
    defaultCalendarLayout: String,
    showModeSwitcher: Boolean,
    showCalendarHeader: Boolean,
    showFooter: Boolean,
    showCreatePlanOption: Boolean,
    showYogaClassesOption: Boolean,
    showInstructorInfo: Boolean,
    showClassDuration: Boolean,
    showClassLevel: Boolean,
    showBookingButton: Boolean,
    showWaitlistOption: Boolean
  },

  calendar: {
    weekStartsOn: String,
    timeFormat: String
  },

  behavior: {
    language: String
  },

  uiPreferences: {
    clickAction: String,
    primaryColor: String,
    fontSize: String,
    animations: Boolean,
    language: String
  }
}, {
  timestamps: true
});

// Compound unique index: each compId should have its own settings document
// If compId is null/undefined, fall back to tenantKey-only uniqueness
settingsSchema.index({ tenantKey: 1, compId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Settings', settingsSchema);
