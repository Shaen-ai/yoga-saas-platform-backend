const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');
const { optionalWixAuth } = require('../middleware/wixSdkAuth');
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
    const compId = req.wix?.compId || req.headers['x-wix-comp-id'] || null;
    console.log('GET /settings - Tenant:', tenantKey, 'compId:', compId);

    // Load settings from DB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Query by compId if available
    let settings = null;
    if (compId) {
      settings = await Settings.findOne({ tenantKey, compId });
    }
    if (!settings) {
      settings = await Settings.findOne({ tenantKey, compId: { $exists: false } });
    }

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
    const compId = req.wix?.compId || req.headers['x-wix-comp-id'] || null;
    console.log('PUT /settings - Tenant:', tenantKey, 'compId:', compId);

    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Load existing settings or create new - query by compId if available
    let settings = null;
    if (compId) {
      settings = await Settings.findOne({ tenantKey, compId });
      if (!settings) {
        settings = new Settings({ tenantKey, compId });
        console.log('PUT /settings - Creating NEW document for compId:', compId);
      }
    } else {
      settings = await Settings.findOne({ tenantKey, compId: { $exists: false } });
      if (!settings) {
        settings = new Settings({ tenantKey });
      }
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
router.get('/ui-preferences', optionalWixAuth, async (req, res) => {
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
      // Query by compId if available, otherwise fall back to tenantKey only
      if (compId) {
        savedSettings = await Settings.findOne({ tenantKey, compId });
        console.log('GET /ui-preferences - Queried by compId:', compId, 'Found:', !!savedSettings);
        
        // AUTO-CREATE: If we have both compId and instanceId but no document exists, create one
        if (!savedSettings && instanceId) {
          console.log('GET /ui-preferences - Creating new settings document for compId:', compId, 'instanceId:', instanceId);
          savedSettings = await Settings.create({
            tenantKey,
            compId,
            instanceId,
            premiumPlanName: 'free'
          });
          console.log('GET /ui-preferences - Created new document with _id:', savedSettings._id);
        }
      }
      // Fall back to tenantKey-only query if no compId or no settings found
      if (!savedSettings) {
        savedSettings = await Settings.findOne({ tenantKey, compId: { $exists: false } });
        console.log('GET /ui-preferences - Fallback to tenantKey only, Found:', !!savedSettings);
      }
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
    },
    premiumPlanName: globalSettings.premiumPlanName || 'free',
    instanceId: instanceId
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

router.post('/ui-preferences', optionalWixAuth, async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';
    const instanceId = req.wix?.instanceId || null;
    const compId = req.wix?.compId || null;
    const mongoose = require('mongoose');

    console.log('POST /ui-preferences - Tenant:', tenantKey, 'instanceId:', instanceId, 'compId:', compId);

    // Check if database is available
    if (mongoose.connection.readyState !== 1) {
      return res.json({ success: true, message: 'Database not connected - changes not persisted', settings: req.body });
    }

    // Build the query and update objects
    const query = { tenantKey };
    if (compId) {
      query.compId = compId;
    } else {
      // For legacy support: find documents without compId (null or doesn't exist)
      query.$or = [
        { compId: null },
        { compId: { $exists: false } }
      ];
    }

    // Build the update object with $set for nested fields
    const updateObj = {
      $set: {
        tenantKey,
        updatedAt: new Date()
      },
      $setOnInsert: {
        createdAt: new Date()
      }
    };

    // Set compId if provided
    if (compId) {
      updateObj.$set.compId = compId;
    }

    // Set instanceId if available
    if (instanceId) {
      updateObj.$set.instanceId = instanceId;
    }

    // Update layout fields
    if (req.body.layout) {
      Object.keys(req.body.layout).forEach(key => {
        updateObj.$set[`layout.${key}`] = req.body.layout[key];
      });
    }

    // Update appearance and uiPreferences fields
    if (req.body.appearance) {
      Object.keys(req.body.appearance).forEach(key => {
        updateObj.$set[`appearance.${key}`] = req.body.appearance[key];
        // Also save primaryColor to uiPreferences for consistency
        if (key === 'primaryColor') {
          updateObj.$set['uiPreferences.primaryColor'] = req.body.appearance[key];
        }
      });
    }

    // Update uiPreferences fields
    if (req.body.uiPreferences) {
      Object.keys(req.body.uiPreferences).forEach(key => {
        updateObj.$set[`uiPreferences.${key}`] = req.body.uiPreferences[key];
      });
    }

    // Update calendar fields
    if (req.body.calendar) {
      Object.keys(req.body.calendar).forEach(key => {
        updateObj.$set[`calendar.${key}`] = req.body.calendar[key];
      });
    }

    // Update behavior fields
    if (req.body.behavior) {
      Object.keys(req.body.behavior).forEach(key => {
        updateObj.$set[`behavior.${key}`] = req.body.behavior[key];
      });
    }

    console.log('POST /ui-preferences - Query:', JSON.stringify(query));
    console.log('POST /ui-preferences - Update fields:', Object.keys(updateObj.$set));

    // Use findOneAndUpdate with upsert for atomic operation
    const settings = await Settings.findOneAndUpdate(
      query,
      updateObj,
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    console.log('POST /ui-preferences - Settings saved/updated, _id:', settings._id);
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings', message: error.message });
  }
});

router.put('/ui-preferences', optionalWixAuth, async (req, res) => {
  try {
    const { instanceId, premiumPlanName } = req.body;
    const mongoose = require('mongoose');

    console.log('PUT /ui-preferences - instanceId:', instanceId, 'premiumPlanName:', premiumPlanName);

    // Validate required fields
    if (!instanceId) {
      return res.status(400).json({ error: 'instanceId is required' });
    }

    if (!premiumPlanName) {
      return res.status(400).json({ error: 'premiumPlanName is required' });
    }

    // Check if database is available
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available' });
    }

    // Update all documents with the given instanceId
    const result = await Settings.updateMany(
      { instanceId: instanceId },
      { $set: { premiumPlanName: premiumPlanName } }
    );

    console.log('PUT /ui-preferences - Updated', result.modifiedCount, 'documents');

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} document(s)`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error updating premium plan name:', error);
    res.status(500).json({ error: 'Failed to update premium plan name', message: error.message });
  }
});

module.exports = router;