const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');
const Settings = require('../models/Settings');

// Default settings template (used when values are not in DB)
const defaultSettings = {
  uiPreferences: {
    clickAction: 'popup', // 'popup' or 'tooltip'
    theme: 'light',
    primaryColor: '#4A90A4',
    accentColor: '#FFA726',
    language: 'en',
    fontSize: 'medium',
    animations: true,
    compactMode: false
  },
  planApproval: {
    requireApproval: true,
    autoApproveBeginners: false,
    notifyOnSubmission: true
  },
  calendar: {
    defaultView: 'month',
    weekStartsOn: 'monday',
    showWeekends: true,
    eventColors: {
      class: '#4A90A4',
      workshop: '#F4A261',
      retreat: '#2E5266'
    }
  },
  notifications: {
    emailEnabled: true,
    emailNotifications: true,
    smsEnabled: false,
    pushEnabled: true,
    pushNotifications: false,
    reminderTime: '09:00',
    frequency: 'daily'
  },
  widget: {
    title: 'Classes & Events',
    autoStart: true,
    showWelcome: true,
    defaultView: 'calendar',
    maxEvents: 10,
    showInstructor: true
  },
  accessibility: {
    highContrast: false,
    reduceMotion: false,
    screenReader: false
  },
  eventCategories: {
    default: [],
    custom: [],
    showCategoryFilter: true
  }
};

// General settings endpoints for dashboard
router.get('/', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    console.log('GET /settings - Tenant:', tenantKey);

    // Load settings from DB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available' });
    }

    let settings = await Settings.findOne({ tenantKey });

    if (!settings) {
      // Return empty settings structure
      return res.json({
        general: {},
        notifications: {},
        business: {}
      });
    }

    res.json({
      general: settings.general || {},
      notifications: settings.notifications || {},
      business: settings.business || {}
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings', message: error.message });
  }
});

router.put('/', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    console.log('PUT /settings - Tenant:', tenantKey);

    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Load existing settings or create new
    let settings = await Settings.findOne({ tenantKey });
    if (!settings) {
      settings = new Settings({ tenantKey });
    }

    // Update fields
    if (req.body.general) {
      settings.general = { ...settings.general, ...req.body.general };
      settings.markModified('general');
    }

    if (req.body.notifications) {
      settings.notifications = { ...settings.notifications, ...req.body.notifications };
      settings.markModified('notifications');
    }

    if (req.body.business) {
      settings.business = { ...settings.business, ...req.body.business };
      settings.markModified('business');
    }

    await settings.save();

    res.json({
      success: true,
      settings: {
        general: settings.general,
        notifications: settings.notifications,
        business: settings.business
      }
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings', message: error.message });
  }
});

// UI preferences endpoint for widget and settings panel
router.get('/ui-preferences', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instanceId = req.wix?.instanceId || null;
    const compId = req.wix?.compId || null;
    const authHeader = req.headers.authorization || null;

    console.log('GET /ui-preferences - Tenant:', tenantKey, 'instanceId:', instanceId, 'compId:', compId);

    // Load settings from DB (skip if no database connection)
    let savedSettings = null;
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      savedSettings = await Settings.findOne({ tenantKey });
    }

    // Merge saved settings with defaults (defaults used when values not in DB)
    const globalSettings = savedSettings ? savedSettings.toObject() : {};

    // Return settings in the format expected by the settings panel
    const panelSettings = {
    layout: {
      defaultView: globalSettings.widget?.defaultView || 'yogaClasses',
      defaultMode: globalSettings.layout?.defaultMode || 'calendar',
      defaultCalendarLayout: globalSettings.layout?.defaultCalendarLayout || globalSettings.calendar?.defaultView || 'month',
      calendarView: globalSettings.layout?.calendarView || globalSettings.calendar?.defaultView || 'month',
      showModeSwitcher: globalSettings.layout?.showModeSwitcher !== false,
      showCalendarHeader: globalSettings.layout?.showCalendarHeader !== false,
      headerTitle: globalSettings.widget?.title || 'Classes',
      showFooter: globalSettings.widget?.showFooter || false,
      compactMode: globalSettings.uiPreferences?.compactMode || false,
      showCreatePlanOption: globalSettings.layout?.showCreatePlanOption !== false,
      showYogaClassesOption: globalSettings.layout?.showYogaClassesOption !== false,
      showInstructorInfo: globalSettings.layout?.showInstructorInfo !== false,
      showClassDuration: globalSettings.layout?.showClassDuration !== false,
      showClassLevel: globalSettings.layout?.showClassLevel !== false,
      showBookingButton: globalSettings.layout?.showBookingButton !== false,
      showWaitlistOption: globalSettings.layout?.showWaitlistOption !== false
    },
    appearance: {
      primaryColor: globalSettings.uiPreferences?.primaryColor || '#2563eb',
      backgroundColor: '#ffffff',
      headerColor: '#f8f9fa',
      borderRadius: 8,
      fontFamily: 'default',
      fontSize: globalSettings.uiPreferences?.fontSize || 'medium'
    },
    calendar: {
      weekStartsOn: globalSettings.calendar?.weekStartsOn || 'sunday',
      timeFormat: globalSettings.calendar?.timeFormat || '12h',
      showWeekNumbers: false,
      eventDisplay: 'block',
      minTime: '06:00',
      maxTime: '22:00'
    },
    behavior: {
      autoSave: true,
      confirmBeforeDelete: true,
      animationsEnabled: globalSettings.uiPreferences?.animations !== false,
      showTooltips: true,
      language: globalSettings.uiPreferences?.language || 'en'
    },
    uiPreferences: {
      clickAction: globalSettings.uiPreferences?.clickAction || 'tooltip'
    }
  };

    // Add auth info to response (used by settings panel for dashboard URL)
    panelSettings.auth = {
      instanceId,
      compId,
      instanceToken: authHeader,
      isAuthenticated: !!authHeader
    };

    console.log('GET /ui-preferences - Returning settings for tenant:', tenantKey);
    res.json(panelSettings);
  } catch (error) {
    console.error('Error in /ui-preferences:', error);
    res.status(500).json({ error: 'Failed to load UI preferences', message: error.message });
  }
});

router.post('/ui-preferences', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const mongoose = require('mongoose');

    // Check if database is available
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'Database not connected - changes not persisted', settings: req.body });
    }

    // Load existing settings from DB or create new
    let settings = await Settings.findOne({ tenantKey });
    if (!settings) {
      settings = new Settings({ tenantKey });
    }

    // Only update individual fields that are provided (only store edited values)
    if (req.body.layout) {
      if (!settings.layout) settings.layout = {};
      Object.keys(req.body.layout).forEach(key => {
        settings.layout[key] = req.body.layout[key];
      });
      settings.markModified('layout');
    }

    if (req.body.appearance) {
      if (!settings.appearance) settings.appearance = {};
      if (!settings.uiPreferences) settings.uiPreferences = {};

      Object.keys(req.body.appearance).forEach(key => {
        settings.appearance[key] = req.body.appearance[key];
        // Also save primaryColor to uiPreferences for consistency
        if (key === 'primaryColor') {
          settings.uiPreferences.primaryColor = req.body.appearance[key];
        }
      });
      settings.markModified('appearance');
      settings.markModified('uiPreferences');
    }

    if (req.body.uiPreferences) {
      if (!settings.uiPreferences) settings.uiPreferences = {};
      Object.keys(req.body.uiPreferences).forEach(key => {
        settings.uiPreferences[key] = req.body.uiPreferences[key];
      });
      settings.markModified('uiPreferences');
    }

    if (req.body.calendar) {
      if (!settings.calendar) settings.calendar = {};
      Object.keys(req.body.calendar).forEach(key => {
        settings.calendar[key] = req.body.calendar[key];
      });
      settings.markModified('calendar');
    }

    if (req.body.behavior) {
      if (!settings.behavior) settings.behavior = {};
      Object.keys(req.body.behavior).forEach(key => {
        settings.behavior[key] = req.body.behavior[key];
      });
      settings.markModified('behavior');
    }

    // Save to MongoDB (only stores fields that have values)
    await settings.save();

    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings', message: error.message });
  }
});

module.exports = router;