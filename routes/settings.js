const express = require('express');
const router = express.Router();
const { addTenantFilter, addTenantToData } = require('../middleware/tenantMiddleware');

// In-memory storage for settings per tenant
const settingsStore = new Map();

// Default settings template
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
    title: 'Yoga Classes & Events',
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

// Get all settings for the current tenant
router.get('/', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const tenantSettings = settingsStore.get(tenantKey) || { ...defaultSettings };
  res.json(tenantSettings);
});

// Update settings for the current tenant
router.put('/', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const currentSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  const updatedSettings = {
    ...currentSettings,
    ...req.body,
    updatedAt: new Date(),
    tenantKey
  };

  settingsStore.set(tenantKey, updatedSettings);
  res.json(updatedSettings);
});

// Special endpoint for UI preferences used by settings panel
router.get('/ui-preferences', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const globalSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  // Return settings in the format expected by the settings panel
  const panelSettings = {
    layout: {
      defaultView: globalSettings.widget?.defaultView || 'yogaClasses',
      defaultMode: 'calendar',
      defaultCalendarLayout: globalSettings.calendar?.defaultView || 'month',
      calendarView: globalSettings.calendar?.defaultView || 'month',
      showModeSwitcher: true,
      showCalendarHeader: true,
      showHeader: globalSettings.widget?.showHeader !== false,
      showMainHeader: true,
      headerTitle: globalSettings.widget?.title || 'Yoga Classes',
      showFooter: globalSettings.widget?.showFooter || false,
      compactMode: globalSettings.uiPreferences?.compactMode || false,
      showCreatePlanOption: true,
      showYogaClassesOption: true,
      showCalendarToggle: true,
      showLanguageSelector: true,
      showThemeToggle: true,
      showSearchBar: true,
      showFilters: true,
      showInstructorInfo: globalSettings.widget?.showInstructor !== false,
      showClassDuration: true,
      showClassLevel: true,
      showBookingButton: true,
      showWaitlistOption: true
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
      timeFormat: '12h',
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
    }
  };
  res.json(panelSettings);
});

router.post('/ui-preferences', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const globalSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  // Update settings from the UI panel
  if (req.body.layout) {
    globalSettings.widget = {
      ...globalSettings.widget,
      defaultView: req.body.layout.defaultView,
      showHeader: req.body.layout.showHeader,
      showFooter: req.body.layout.showFooter,
      title: req.body.layout.headerTitle,
      showInstructor: req.body.layout.showInstructorInfo
    };
    globalSettings.calendar = {
      ...globalSettings.calendar,
      defaultView: req.body.layout.calendarView
    };
    globalSettings.uiPreferences.compactMode = req.body.layout.compactMode;
  }

  if (req.body.appearance) {
    globalSettings.uiPreferences = {
      ...globalSettings.uiPreferences,
      primaryColor: req.body.appearance.primaryColor,
      fontSize: req.body.appearance.fontSize
    };
  }

  if (req.body.calendar) {
    globalSettings.calendar = {
      ...globalSettings.calendar,
      weekStartsOn: req.body.calendar.weekStartsOn
    };
  }

  if (req.body.behavior) {
    globalSettings.uiPreferences = {
      ...globalSettings.uiPreferences,
      animations: req.body.behavior.animationsEnabled,
      language: req.body.behavior.language
    };
  }

  globalSettings.updatedAt = new Date();
  globalSettings.tenantKey = tenantKey;

  settingsStore.set(tenantKey, globalSettings);
  res.json({ success: true, settings: globalSettings });
});

// Widget-specific configuration endpoint
router.get('/widget-config', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const globalSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  res.json({
    general: {
      title: globalSettings.widget?.title || 'Yoga Classes & Events',
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
  const tenantKey = req.tenantKey || 'default';
  const globalSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  // Update widget-specific settings
  if (req.body.general) {
    globalSettings.uiPreferences.language = req.body.general.language || globalSettings.uiPreferences.language;
    globalSettings.widget = {
      ...globalSettings.widget,
      title: req.body.general.title || globalSettings.widget.title,
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

  globalSettings.updatedAt = new Date();
  globalSettings.tenantKey = tenantKey;
  settingsStore.set(tenantKey, globalSettings);

  res.json({ success: true, message: 'Widget configuration updated' });
});

// Get specific setting category - MUST BE AFTER SPECIFIC ROUTES
router.get('/:category', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const globalSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  const category = globalSettings[req.params.category];
  if (!category) {
    return res.status(404).json({ error: 'Setting category not found' });
  }
  res.json(category);
});

// Update specific setting category
router.put('/:category', (req, res) => {
  const tenantKey = req.tenantKey || 'default';
  const globalSettings = settingsStore.get(tenantKey) || { ...defaultSettings };

  if (!globalSettings[req.params.category]) {
    return res.status(404).json({ error: 'Setting category not found' });
  }

  globalSettings[req.params.category] = {
    ...globalSettings[req.params.category],
    ...req.body
  };

  globalSettings.updatedAt = new Date();
  globalSettings.tenantKey = tenantKey;
  settingsStore.set(tenantKey, globalSettings);

  res.json(globalSettings[req.params.category]);
});

module.exports = router;