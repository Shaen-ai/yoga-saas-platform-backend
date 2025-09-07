const express = require('express');
const router = express.Router();

// In-memory storage for settings
let globalSettings = {
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
  }
};

// Get all settings
router.get('/', (req, res) => {
  res.json(globalSettings);
});

// Update settings
router.put('/', (req, res) => {
  globalSettings = {
    ...globalSettings,
    ...req.body,
    updatedAt: new Date()
  };
  res.json(globalSettings);
});

// Special endpoint for UI preferences used by settings panel
router.get('/ui-preferences', (req, res) => {
  res.json(globalSettings);
});

router.post('/ui-preferences', (req, res) => {
  // Update all settings from the UI panel
  globalSettings = {
    ...globalSettings,
    ...req.body,
    updatedAt: new Date()
  };
  res.json({ success: true, settings: globalSettings });
});

// Widget-specific configuration endpoint
router.get('/widget-config', (req, res) => {
  res.json({
    general: {
      siteName: globalSettings.widget?.siteName || 'Yoga Studio',
      language: globalSettings.uiPreferences?.language || 'en',
      timezone: globalSettings.calendar?.timezone || 'UTC',
      dateFormat: globalSettings.calendar?.dateFormat || 'MM/DD/YYYY'
    },
    appearance: {
      primaryColor: globalSettings.uiPreferences?.primaryColor || '#116DFF',
      layout: globalSettings.widget?.defaultView || 'grid',
      theme: globalSettings.uiPreferences?.theme || 'light',
      showHeader: globalSettings.widget?.showHeader !== false,
      showFooter: globalSettings.widget?.showFooter !== false
    },
    features: {
      enableBooking: globalSettings.widget?.enableBooking !== false,
      enablePayments: globalSettings.widget?.enablePayments !== false,
      enableNotifications: globalSettings.notifications?.emailEnabled || false,
      enableAnalytics: globalSettings.widget?.enableAnalytics || false,
      maxBookingsPerUser: globalSettings.widget?.maxBookingsPerUser || 5
    }
  });
});

router.post('/widget-config', (req, res) => {
  // Update widget-specific settings
  if (req.body.general) {
    globalSettings.uiPreferences.language = req.body.general.language || globalSettings.uiPreferences.language;
    globalSettings.widget = {
      ...globalSettings.widget,
      siteName: req.body.general.siteName
    };
  }
  
  if (req.body.appearance) {
    globalSettings.uiPreferences.primaryColor = req.body.appearance.primaryColor || globalSettings.uiPreferences.primaryColor;
    globalSettings.uiPreferences.theme = req.body.appearance.theme || globalSettings.uiPreferences.theme;
    globalSettings.widget = {
      ...globalSettings.widget,
      defaultView: req.body.appearance.layout,
      showHeader: req.body.appearance.showHeader,
      showFooter: req.body.appearance.showFooter
    };
  }
  
  if (req.body.features) {
    globalSettings.widget = {
      ...globalSettings.widget,
      ...req.body.features
    };
    globalSettings.notifications.emailEnabled = req.body.features.enableNotifications || false;
  }
  
  res.json({ success: true, message: 'Widget configuration updated' });
});

// Get specific setting category - MUST BE AFTER SPECIFIC ROUTES
router.get('/:category', (req, res) => {
  const category = globalSettings[req.params.category];
  if (!category) {
    return res.status(404).json({ error: 'Setting category not found' });
  }
  res.json(category);
});

// Update specific setting category
router.put('/:category', (req, res) => {
  if (!globalSettings[req.params.category]) {
    return res.status(404).json({ error: 'Setting category not found' });
  }
  
  globalSettings[req.params.category] = {
    ...globalSettings[req.params.category],
    ...req.body
  };
  
  res.json(globalSettings[req.params.category]);
});

module.exports = router;