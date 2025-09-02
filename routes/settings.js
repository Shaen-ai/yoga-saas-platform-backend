const express = require('express');
const router = express.Router();

// In-memory storage for settings
let globalSettings = {
  uiPreferences: {
    clickAction: 'popup', // 'popup' or 'tooltip'
    theme: 'light',
    primaryColor: '#4A90A4',
    language: 'en'
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
    smsEnabled: false,
    pushEnabled: true
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

// Get specific setting category
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