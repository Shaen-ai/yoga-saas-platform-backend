const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  tenantKey: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
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

module.exports = mongoose.model('Settings', settingsSchema);
