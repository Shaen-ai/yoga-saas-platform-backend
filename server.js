const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.config');
const { attachTenantInfo } = require('./middleware/tenantMiddleware');
const { optionalWixAuth } = require('./middleware/wixSdkAuth');
const Settings = require('./models/Settings');
const Event = require('./models/Event');
require('dotenv').config();

// Validate environment variables
const validateEnvironment = require('./utils/validateEnv');
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 8000;

// Trust proxy - required for rate limiting behind reverse proxy (nginx, etc.)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());

// CORS configuration - Allow all origins for widget embedding
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:3000',  // Widget dev server
      'http://localhost:3001',  // Settings UI
      'http://localhost:3002',  // Dashboard
      'http://localhost:8080',  // Widget alternative
      'http://localhost:5000',  // Alternative Settings port
      'https://yoga-api.nextechspires.com',
      'https://yoga-dashboard.nextechspires.com',
      'https://yoga-settings.nextechspires.com',
      'https://yoga-widget.nextechspires.com'
    ];
    
    // Check if origin is in allowed list or matches patterns
    if (allowedOrigins.indexOf(origin) !== -1 || 
        /\.wixsite\.com$/.test(origin) || 
        /\.editorx\.io$/.test(origin) ||
        /\.wix\.com$/.test(origin) ||
        /\.netlify\.app$/.test(origin) ||
        /\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      // For widget embedding, allow all origins but log them
      console.log('CORS request from origin:', origin);
      callback(null, true); // Allow all origins for widget
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-User-ID', 'X-Wix-Comp-Id', 'X-Wix-Instance']
}));

// Rate limiting with much higher limits for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window (shorter to reset faster)
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // 10000 for dev, 100 for prod
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development or for specific endpoints
  skip: (req) => {
    // Skip rate limiting entirely in development
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return req.path.includes('/settings') || req.path.includes('/widget-config');
  }
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Tenant isolation middleware - attach tenant info to all requests
app.use(attachTenantInfo);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Database connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/yoga_saas';
  const skipDB = process.env.SKIP_DB === 'true';

  if (skipDB) {
    console.log('⚠️  SKIP_DB=true - Running without database (not for production!)');
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');

    // Fix indexes - drop any unique index on tenantKey alone
    // This allows multiple settings documents with the same tenantKey (differentiated by compId)
    await fixSettingsIndexes();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('FATAL: Database is required in production. Exiting...');
      process.exit(1);
    } else {
      console.log('⚠️  Running without database in development mode');
    }
  }
};

// Fix Settings collection indexes - remove problematic unique index on tenantKey
const fixSettingsIndexes = async () => {
  try {
    const collection = mongoose.connection.collection('settings');
    const indexes = await collection.indexes();
    
    // Find and drop any unique index on tenantKey alone
    for (const index of indexes) {
      // Check if it's a unique index on just tenantKey (not compound)
      if (index.unique && index.key && index.key.tenantKey && Object.keys(index.key).length === 1) {
        console.log(`⚠️  Found problematic unique index on tenantKey: ${index.name}`);
        try {
          await collection.dropIndex(index.name);
          console.log(`✅ Dropped unique index: ${index.name}`);
        } catch (dropErr) {
          console.error(`❌ Failed to drop index ${index.name}:`, dropErr.message);
        }
      }
    }
  } catch (err) {
    // Collection might not exist yet, which is fine
    if (err.code !== 26) { // 26 = NamespaceNotFound
      console.error('⚠️  Error checking indexes:', err.message);
    }
  }
};

connectDB();

// Routes
// Note: /api/auth route removed - using Wix SDK authentication instead
// Apply optional Wix authentication to all API routes
// This will verify the token if present, but allow requests without it in development
app.use('/api/users', optionalWixAuth, require('./routes/users'));
app.use('/api/instructors', optionalWixAuth, require('./routes/instructors'));
app.use('/api/yoga-plans', optionalWixAuth, require('./routes/yoga-plans'));
app.use('/api/ai', optionalWixAuth, require('./routes/ai-generation'));
app.use('/api/events', optionalWixAuth, require('./routes/events'));
app.use('/api/settings', optionalWixAuth, require('./routes/settings'));
app.use('/api/analytics', optionalWixAuth, require('./routes/analytics'));
app.use('/api/payment-settings', optionalWixAuth, require('./routes/payment-settings'));
app.use('/api/notifications', optionalWixAuth, require('./routes/notifications'));
// PayPal API routes commented out - using simplified PayPal checkout links instead
// Uncomment if implementing Stripe or other API-based payment integrations
// app.use('/api/payments', optionalWixAuth, require('./routes/payments'));

/**
 * @swagger
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Health check endpoint
 *     description: Check if the API is running and database connection status
 *     responses:
 *       200:
 *         description: API is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: string
 *                   enum: [connected, disconnected]
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

/**
 * @swagger
 * /:
 *   get:
 *     tags: [Health]
 *     summary: API root endpoint
 *     description: Get basic API information and available endpoints
 *     responses:
 *       200:
 *         description: API information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 version:
 *                   type: string
 *                 documentation:
 *                   type: string
 *                 endpoints:
 *                   type: object
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Yoga SaaS Backend API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      plans: '/api/yoga-plans',
      ai: '/api/ai',
      events: '/api/events',
      settings: '/api/settings',
      paymentSettings: '/api/payment-settings'
      // payments: '/api/payments' - disabled, using simple PayPal checkout links
    }
  });
});

// Helper function to compute tenant key from instanceId and compId
const computeTenantKey = (instanceId, compId) => {
  if (!instanceId) {
    return 'default';
  }
  return `yoga-${instanceId}${compId ? `-${compId}` : ''}`;
};

// Helper function to get premiumPlanName from existing documents with the same instanceId
// This ensures all widgets for the same Wix site share the same premium plan
const getPremiumPlanFromInstance = async (instanceId) => {
  if (!instanceId) return 'free';
  
  try {
    // Find any existing settings document with this instanceId that has a premium plan
    const existingSettings = await Settings.findOne({
      instanceId,
      premiumPlanName: { $exists: true, $ne: null, $ne: 'free' }
    }).select('premiumPlanName').lean();
    
    if (existingSettings?.premiumPlanName) {
      console.log(`[getPremiumPlanFromInstance] Found existing premium plan for instanceId ${instanceId}: ${existingSettings.premiumPlanName}`);
      return existingSettings.premiumPlanName;
    }
    
    // If no premium plan found, check if there's any document with this instanceId (even with 'free')
    const anySettings = await Settings.findOne({ instanceId }).select('premiumPlanName').lean();
    if (anySettings?.premiumPlanName) {
      return anySettings.premiumPlanName;
    }
  } catch (error) {
    console.error('[getPremiumPlanFromInstance] Error:', error.message);
  }
  
  return 'free';
};

// Default widget config
const defaultWidgetConfig = {
  layout: {
    defaultMode: 'calendar',
    defaultCalendarLayout: 'month',
    showModeSwitcher: true,
    showFooter: false
  },
  appearance: {
    primaryColor: '#4A90A4',
    fontSize: 'medium',
    borderRadius: 8
  },
  calendar: {
    weekStartsOn: 'sunday'
  },
  behavior: {
    animationsEnabled: true,
    language: 'en'
  }
};

// Register a widget (called when widget first loads to ensure it's in the database)
app.post('/api/widgets/register', optionalWixAuth, async (req, res) => {
  try {
    const instanceId = req.wix?.instanceId;
    const compId = req.wix?.compId;
    const widgetName = req.body?.widgetName || '';

    console.log('[API /widgets/register] Request:', { instanceId, compId, widgetName });

    if (!instanceId || !compId) {
      return res.status(400).json({ error: 'instanceId and compId are required' });
    }

    const tenantKey = computeTenantKey(instanceId, compId);

    // Find or create settings for this widget
    let settings = await Settings.findOne({ tenantKey });
    if (!settings) {
      // Get premium plan from existing documents with the same instanceId
      const inheritedPremiumPlan = await getPremiumPlanFromInstance(instanceId);
      
      settings = new Settings({
        tenantKey,
        instanceId,
        compId,
        widgetName: widgetName || `Widget ${compId.slice(-6)}`,
        premiumPlanName: inheritedPremiumPlan
      });
      await settings.save();
      console.log('[API /widgets/register] Created new widget:', { tenantKey, instanceId, compId, premiumPlanName: inheritedPremiumPlan });
    } else {
      // Update instanceId/compId if not set
      let needsUpdate = false;
      if (!settings.instanceId) {
        settings.instanceId = instanceId;
        needsUpdate = true;
      }
      if (!settings.compId) {
        settings.compId = compId;
        needsUpdate = true;
      }
      if (needsUpdate) {
        await settings.save();
        console.log('[API /widgets/register] Updated existing widget:', { tenantKey, instanceId, compId });
      }
    }

    res.json({
      success: true,
      widget: {
        compId: settings.compId,
        widgetName: settings.widgetName || '',
        instanceId: settings.instanceId
      }
    });
  } catch (error) {
    console.error('Error registering widget:', error);
    res.status(500).json({ error: 'Failed to register widget' });
  }
});

// Get all widgets for an instance (used by dashboard when no compId is specified)
app.get('/api/widgets', optionalWixAuth, async (req, res) => {
  try {
    const instanceId = req.wix?.instanceId;
    const authHeader = req.headers.authorization;

    console.log('[API /widgets] Request received:', {
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : 'none',
      instanceId: instanceId || 'not found',
      wixData: req.wix ? 'present' : 'missing'
    });

    if (!instanceId) {
      console.log('[API /widgets] No instanceId - token verification may have failed');
      return res.status(400).json({ error: 'Instance ID is required. Make sure you are authenticated.' });
    }

    const widgets = await Settings.find({
      instanceId: instanceId,
      compId: { $exists: true, $nin: [null, ''] }
    }).select('compId widgetName layout createdAt updatedAt').lean();

    const widgetList = widgets.map(w => ({
      compId: w.compId,
      widgetName: w.widgetName || '',
      defaultView: w.layout?.defaultMode || 'calendar',
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }));

    res.json(widgetList);
  } catch (error) {
    console.error('Error fetching widgets:', error);
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Combined endpoint - fetches settings and events in a single request
// This replaces separate calls to /settings/ui-preferences and /events
app.get('/api/widget-data', optionalWixAuth, async (req, res) => {
  try {
    // Extract instanceId from decoded Authorization token (set by optionalWixAuth middleware)
    // Extract compId from X-Wix-Comp-Id header (set by optionalWixAuth middleware)
    const instanceId = req.wix?.instanceId;
    const compId = req.wix?.compId;
    const tenantKey = req.tenantKey || 'default';

    console.log('[Widget Data] Request headers:');
    console.log('[Widget Data] - X-Wix-Comp-Id:', req.headers['x-wix-comp-id']);
    console.log('[Widget Data] - Authorization:', req.headers.authorization ? 'present' : 'missing');
    console.log('[Widget Data] Extracted values from middleware:');
    console.log('[Widget Data] - instanceId (decoded from Authorization token):', instanceId);
    console.log('[Widget Data] - compId (from X-Wix-Comp-Id header):', compId);

    // Default settings (same format as /settings/ui-preferences)
    const defaultSettings = {
      layout: {
        defaultView: 'yogaClasses',
        defaultMode: 'calendar',
        defaultCalendarLayout: 'month',
        calendarView: 'month',
        showModeSwitcher: true,
        showCalendarHeader: true,
        headerTitle: 'Classes',
        showFooter: false,
        compactMode: false,
        showCreatePlanOption: true,
        showYogaClassesOption: true,
        showInstructorInfo: true,
        showClassDuration: true,
        showClassLevel: true,
        showBookingButton: true,
        showWaitlistOption: true
      },
      appearance: {
        primaryColor: '#4A90A4',
        backgroundColor: '#ffffff',
        headerColor: '#f8f9fa',
        borderRadius: 8,
        fontFamily: 'default',
        fontSize: 'medium'
      },
      calendar: {
        weekStartsOn: 'sunday',
        timeFormat: '12h',
        showWeekNumbers: false,
        eventDisplay: 'block',
        minTime: '06:00',
        maxTime: '22:00'
      },
      behavior: {
        autoSave: true,
        confirmBeforeDelete: true,
        animationsEnabled: true,
        showTooltips: true,
        language: 'en'
      },
      uiPreferences: {
        clickAction: 'tooltip'
      },
      eventCategories: {
        default: [],
        custom: [],
        showCategoryFilter: true
      },
      // Default premium plan - free (widget will show notice in editor, hide on published site)
      premiumPlanName: 'free'
    };

    // CASE 1: No instanceId AND no compId - return default data
    if ((!instanceId || instanceId === '') && (!compId || compId === '')) {
      console.log('[Widget Data] CASE 1: No auth, no compId - returning default data');
      res.json({
        settings: defaultSettings,
        events: []
      });
      return;
    }

    // CASE 2: Has compId but NO instanceId (EDITOR MODE)
    // Fetch data by compId only, without instance authentication
    // instanceId will be empty string '' in editor mode, compId should be the actual ID
    if ((!instanceId || instanceId === '') && compId && compId !== '') {
      console.log('[Widget Data] CASE 2: Editor mode - compId without auth:', compId);

      // Find ANY settings with this compId (across all instances)
      // This allows editor to see the widget's data without authentication
      const [config, events] = await Promise.all([
        Settings.findOne({ compId }).lean(),
        Event.find({ compId, isVisible: { $ne: false } }).sort({ start: 1 }).lean()
      ]);

      console.log('[Widget Data] CASE 2 results - config found:', !!config, 'events found:', events.length);

      // If no config found, return defaults
      if (!config) {
        res.json({
          settings: defaultSettings,
          events: []
        });
        return;
      }

      // Return actual settings from DB
      const settings = {
        layout: {
          defaultView: config.widget?.defaultView || 'yogaClasses',
          defaultMode: config.layout?.defaultMode || 'calendar',
          defaultCalendarLayout: config.layout?.defaultCalendarLayout || config.calendar?.defaultView || 'month',
          calendarView: config.layout?.calendarView || config.calendar?.defaultView || 'month',
          showModeSwitcher: config.layout?.showModeSwitcher !== false,
          showCalendarHeader: config.layout?.showCalendarHeader !== false,
          headerTitle: config.widget?.title || 'Classes',
          showFooter: config.widget?.showFooter || false,
          compactMode: config.uiPreferences?.compactMode || false,
          showCreatePlanOption: config.layout?.showCreatePlanOption !== false,
          showYogaClassesOption: config.layout?.showYogaClassesOption !== false,
          showInstructorInfo: config.layout?.showInstructorInfo !== false,
          showClassDuration: config.layout?.showClassDuration !== false,
          showClassLevel: config.layout?.showClassLevel !== false,
          showBookingButton: config.layout?.showBookingButton !== false,
          showWaitlistOption: config.layout?.showWaitlistOption !== false
        },
        appearance: {
          primaryColor: config.uiPreferences?.primaryColor || '#4A90A4',
          backgroundColor: '#ffffff',
          headerColor: '#f8f9fa',
          borderRadius: 8,
          fontFamily: 'default',
          fontSize: config.uiPreferences?.fontSize || 'medium'
        },
        calendar: {
          weekStartsOn: config.calendar?.weekStartsOn || 'sunday',
          timeFormat: config.calendar?.timeFormat || '12h',
          showWeekNumbers: false,
          eventDisplay: 'block',
          minTime: '06:00',
          maxTime: '22:00',
          showWeekends: config.calendar?.showWeekends !== false,
          showEventTime: config.calendar?.showEventTime || false
        },
        behavior: {
          autoSave: true,
          confirmBeforeDelete: true,
          animationsEnabled: config.uiPreferences?.animations !== false,
          showTooltips: true,
          language: config.uiPreferences?.language || 'en'
        },
        uiPreferences: {
          clickAction: config.uiPreferences?.clickAction || 'tooltip'
        },
        eventCategories: config.eventCategories || {
          default: [],
          custom: [],
          showCategoryFilter: true
        },
        business: config.business || {},
        premiumPlanName: config.premiumPlanName || 'free'
      };

      res.json({
        settings,
        events: events || []
      });
      return;
    }

    // CASE 3: Has instanceId (authenticated request - published site)

    // Compute tenant keys using instanceId and compId
    const desiredKey = computeTenantKey(instanceId, compId);
    const instanceFallbackKey = computeTenantKey(instanceId, null);

    // Build keys to query for settings
    const keysToQuery = [desiredKey];
    if (instanceFallbackKey !== desiredKey) {
      keysToQuery.push(instanceFallbackKey);
    }

    console.log('[Widget Data] Querying database with:');
    console.log('[Widget Data] - Settings query keys:', keysToQuery);
    console.log('[Widget Data] - Events query: { instanceId:', instanceId, ', compId:', compId, '}');

    // Run settings and events queries in parallel for maximum performance
    const [configs, events] = await Promise.all([
      Settings.find({ tenantKey: { $in: keysToQuery } }).lean(),
      compId
        ? Event.find({ instanceId, compId, isVisible: { $ne: false } }).sort({ start: 1 }).lean()
        : Promise.resolve([])
    ]);

    console.log('[Widget Data] Database results:');
    console.log('[Widget Data] - Settings found:', configs.length);
    console.log('[Widget Data] - Events found:', events.length);

    // Find the best matching config
    let savedSettings = configs.find(c => c.tenantKey === desiredKey)
      || configs.find(c => c.tenantKey === instanceFallbackKey)
      || null;

    // FALLBACK: If no settings found by tenantKey, try querying by instanceId or compId
    if (!savedSettings && (instanceId || compId)) {
      console.log('[Widget Data] No settings found by tenantKey, trying fallback queries...');

      if (instanceId) {
        savedSettings = await Settings.findOne({ instanceId }).lean();
        if (savedSettings) {
          console.log('[Widget Data] ✅ Found settings by instanceId:', instanceId);
        }
      }

      if (!savedSettings && compId) {
        savedSettings = await Settings.findOne({ compId }).lean();
        if (savedSettings) {
          console.log('[Widget Data] ✅ Found settings by compId:', compId);
        }
      }
    }

    // AUTO-CREATE: If we have both compId and instanceId but no document exists, create one
    if (!savedSettings && compId && instanceId) {
      // Get premium plan from existing documents with the same instanceId
      const inheritedPremiumPlan = await getPremiumPlanFromInstance(instanceId);
      console.log('[Widget Data] 🆕 No settings found - creating new document for compId:', compId, 'instanceId:', instanceId, 'premiumPlan:', inheritedPremiumPlan);
      try {
        const newSettings = await Settings.create({
          tenantKey: desiredKey,
          compId,
          instanceId,
          premiumPlanName: inheritedPremiumPlan
        });
        savedSettings = newSettings.toObject();
        console.log('[Widget Data] ✅ Created new settings document with _id:', savedSettings._id);
      } catch (createError) {
        console.error('[Widget Data] ⚠️ Failed to create settings document:', createError.message);
        // Continue with defaults if create fails
      }
    }

    console.log('[Widget Data] Settings selection:');
    console.log('[Widget Data] - Using settings with tenantKey:', savedSettings?.tenantKey || 'none (using defaults)');
    console.log('[Widget Data] - Settings matched by:',
      savedSettings?.tenantKey === desiredKey ? 'exact match (instanceId + compId)' :
      savedSettings?.tenantKey === instanceFallbackKey ? 'fallback (instanceId only)' :
      'no match');

    // Determine premium plan - prefer DB value, fallback to Wix
    const vendorProductId = req.wix?.vendorProductId || null;
    let premiumPlanName = 'free';

    console.log('[Widget Data] Premium plan determination:');
    console.log('[Widget Data] - Wix vendorProductId:', vendorProductId);
    console.log('[Widget Data] - DB premiumPlanName:', savedSettings?.premiumPlanName);

    // First, check if we have a DB value (manual override takes priority)
    if (savedSettings?.premiumPlanName) {
      premiumPlanName = savedSettings.premiumPlanName;
      console.log('[Widget Data] ✅ Using DB premium plan:', premiumPlanName);
    } else if (vendorProductId) {
      // Fallback to Wix vendorProductId if no DB value
      premiumPlanName = vendorProductId === 'true' ? 'light' : vendorProductId;
      console.log('[Widget Data] - Using Wix vendorProductId:', premiumPlanName);
    } else {
      console.log('[Widget Data] - Using default (free)');
    }

    // Build response in the same format as /settings/ui-preferences
    const settings = {
      layout: {
        defaultView: savedSettings?.widget?.defaultView || 'yogaClasses',
        defaultMode: savedSettings?.layout?.defaultMode || 'calendar',
        defaultCalendarLayout: savedSettings?.layout?.defaultCalendarLayout || savedSettings?.calendar?.defaultView || 'month',
        calendarView: savedSettings?.layout?.calendarView || savedSettings?.calendar?.defaultView || 'month',
        showModeSwitcher: savedSettings?.layout?.showModeSwitcher !== false,
        showCalendarHeader: savedSettings?.layout?.showCalendarHeader !== false,
        headerTitle: savedSettings?.widget?.title || 'Classes',
        showFooter: savedSettings?.widget?.showFooter || false,
        compactMode: savedSettings?.uiPreferences?.compactMode || false,
        showCreatePlanOption: savedSettings?.layout?.showCreatePlanOption !== false,
        showYogaClassesOption: savedSettings?.layout?.showYogaClassesOption !== false,
        showInstructorInfo: savedSettings?.layout?.showInstructorInfo !== false,
        showClassDuration: savedSettings?.layout?.showClassDuration !== false,
        showClassLevel: savedSettings?.layout?.showClassLevel !== false,
        showBookingButton: savedSettings?.layout?.showBookingButton !== false,
        showWaitlistOption: savedSettings?.layout?.showWaitlistOption !== false
      },
      appearance: {
        primaryColor: savedSettings?.uiPreferences?.primaryColor || '#4A90A4',
        backgroundColor: '#ffffff',
        headerColor: '#f8f9fa',
        borderRadius: 8,
        fontFamily: 'default',
        fontSize: savedSettings?.uiPreferences?.fontSize || 'medium'
      },
      calendar: {
        weekStartsOn: savedSettings?.calendar?.weekStartsOn || 'sunday',
        timeFormat: savedSettings?.calendar?.timeFormat || '12h',
        showWeekNumbers: false,
        eventDisplay: 'block',
        minTime: '06:00',
        maxTime: '22:00',
        showWeekends: savedSettings?.calendar?.showWeekends !== false,
        showEventTime: savedSettings?.calendar?.showEventTime || false
      },
      behavior: {
        autoSave: true,
        confirmBeforeDelete: true,
        animationsEnabled: savedSettings?.uiPreferences?.animations !== false,
        showTooltips: true,
        language: savedSettings?.uiPreferences?.language || 'en'
      },
      uiPreferences: {
        clickAction: savedSettings?.uiPreferences?.clickAction || 'tooltip'
      },
      eventCategories: savedSettings?.eventCategories || {
        default: [],
        custom: [],
        showCategoryFilter: true
      },
      business: savedSettings?.business || {},
      // Include premium plan name for widget visibility check
      premiumPlanName: premiumPlanName
    };

    res.json({
      settings,
      events: events || []
    });
  } catch (error) {
    console.error('Error fetching widget data:', error);
    res.status(500).json({ error: 'Failed to fetch widget data' });
  }
});

// Premium status check - used by widget to determine premium features
app.get('/api/premium-status', optionalWixAuth, async (req, res) => {
  try {
    const vendorProductId = req.wix?.vendorProductId || null;
    const instanceId = req.wix?.instanceId || null;
    const compId = req.wix?.compId || null;

    // Determine premium plan - prefer DB value, fallback to Wix
    let premiumPlanName = 'free';

    // Check DB first (manual override takes priority)
    if (instanceId) {
      const desiredKey = computeTenantKey(instanceId, compId);
      const instanceFallbackKey = computeTenantKey(instanceId, null);

      const keysToQuery = [desiredKey];
      if (instanceFallbackKey !== desiredKey) {
        keysToQuery.push(instanceFallbackKey);
      }

      const configs = await Settings.find({ tenantKey: { $in: keysToQuery } }).lean();
      const savedSettings = configs.find(c => c.tenantKey === desiredKey)
        || configs.find(c => c.tenantKey === instanceFallbackKey)
        || null;

      if (savedSettings?.premiumPlanName) {
        premiumPlanName = savedSettings.premiumPlanName;
        console.log('[Premium Status] ✅ Using DB premium plan:', premiumPlanName);
      } else if (vendorProductId) {
        // Fallback to Wix vendorProductId if no DB value
        premiumPlanName = vendorProductId === 'true' ? 'light' : vendorProductId;
        console.log('[Premium Status] - Using Wix vendorProductId:', premiumPlanName);
      }
    } else if (vendorProductId) {
      // No instanceId, use Wix value
      premiumPlanName = vendorProductId === 'true' ? 'light' : vendorProductId;
    }

    res.json({
      instanceId,
      vendorProductId,
      premiumPlanName,
      isPremium: premiumPlanName !== 'free'
    });
  } catch (error) {
    console.error('Error getting premium status:', error);
    res.status(500).json({ error: 'Failed to get premium status' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.BYPASS_AUTH === 'true') {
    console.log('🚀 Auth bypass enabled for development');
  }
});

module.exports = app;