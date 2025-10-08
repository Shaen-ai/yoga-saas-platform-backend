const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger.config');
const { attachTenantInfo } = require('./middleware/tenantMiddleware');
require('dotenv').config();

// Validate environment variables
const validateEnvironment = require('./utils/validateEnv');
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 8000;

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

// Rate limiting with higher limits for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // increased limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for settings endpoints
  skip: (req) => {
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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/yoga-plans', require('./routes/yoga-plans'));
app.use('/api/ai', require('./routes/ai-generation'));
app.use('/api/events', require('./routes/events'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/payment-settings', require('./routes/payment-settings'));

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
    }
  });
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