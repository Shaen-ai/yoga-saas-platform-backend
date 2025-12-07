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

connectDB();

// Routes
// Note: /api/auth route removed - using Wix SDK authentication instead
app.use('/api/users', require('./routes/users'));
app.use('/api/instructors', require('./routes/instructors'));
app.use('/api/yoga-plans', require('./routes/yoga-plans'));
app.use('/api/ai', require('./routes/ai-generation'));
app.use('/api/events', require('./routes/events'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/payment-settings', require('./routes/payment-settings'));
app.use('/api/notifications', require('./routes/notifications'));
// PayPal API routes commented out - using simplified PayPal checkout links instead
// Uncomment if implementing Stripe or other API-based payment integrations
// app.use('/api/payments', require('./routes/payments'));

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

// Get all widgets for an instance (used by dashboard when no compId is specified)
app.get('/api/widgets', optionalWixAuth, async (req, res) => {
  try {
    const instanceId = req.wix?.instanceId;

    if (!instanceId) {
      return res.status(400).json({ error: 'Instance ID is required' });
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

// Combined endpoint - fetches both config and events in a single request
app.get('/api/widget-data', optionalWixAuth, async (req, res) => {
  try {
    const instanceId = req.wix?.instanceId;
    const compId = req.wix?.compId;

    // If no instanceId, return defaults without creating/querying DB
    if (!instanceId) {
      res.json({
        config: {
          ...defaultWidgetConfig,
          widgetName: '',
          premiumPlanName: 'free'
        },
        events: []
      });
      return;
    }

    const desiredKey = computeTenantKey(instanceId, compId);
    const instanceFallbackKey = computeTenantKey(instanceId, null);

    // Build keys to query for config
    const keysToQuery = [desiredKey];
    if (instanceFallbackKey !== desiredKey) {
      keysToQuery.push(instanceFallbackKey);
    }

    // Run config and events queries in parallel
    const [configs, events] = await Promise.all([
      Settings.find({ tenantKey: { $in: keysToQuery } }).lean(),
      compId
        ? Event.find({ instanceId, compId }).sort({ createdAt: -1 }).lean()
        : Promise.resolve([])
    ]);

    // Find the best matching config
    const config = configs.find(c => c.tenantKey === desiredKey)
      || configs.find(c => c.tenantKey === instanceFallbackKey)
      || null;

    // Determine premium plan
    let premiumPlanName;
    if (config?.premiumPlanName) {
      premiumPlanName = config.premiumPlanName;
    } else if (req.wix?.vendorProductId) {
      // If vendorProductId is 'true', treat as 'light'
      premiumPlanName = req.wix.vendorProductId === 'true' ? 'light' : req.wix.vendorProductId;
    } else {
      premiumPlanName = 'free';
    }

    res.json({
      config: {
        layout: config?.layout || defaultWidgetConfig.layout,
        appearance: config?.appearance || defaultWidgetConfig.appearance,
        calendar: config?.calendar || defaultWidgetConfig.calendar,
        behavior: config?.behavior || defaultWidgetConfig.behavior,
        widgetName: config?.widgetName || '',
        premiumPlanName
      },
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

    // Determine premium plan based on vendorProductId
    let premiumPlanName = 'free';
    if (vendorProductId) {
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