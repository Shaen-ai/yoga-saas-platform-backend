const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Yoga SaaS Platform API',
    version: '1.0.0',
    description: 'Backend API documentation for Yoga SaaS Platform',
    contact: {
      name: 'API Support',
      email: 'support@yogasaas.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:8000',
      description: 'Development server'
    },
    {
      url: 'https://api.yogasaas.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'instructor', 'student'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      YogaPlan: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          duration: { type: 'number' },
          difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
          poses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                duration: { type: 'number' },
                description: { type: 'string' }
              }
            }
          },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          startTime: { type: 'string', format: 'date-time' },
          endTime: { type: 'string', format: 'date-time' },
          instructor: { type: 'string' },
          maxParticipants: { type: 'number' },
          participants: {
            type: 'array',
            items: { type: 'string' }
          },
          type: { type: 'string', enum: ['class', 'workshop', 'retreat'] },
          status: { type: 'string', enum: ['scheduled', 'ongoing', 'completed', 'cancelled'] }
        }
      },
      Settings: {
        type: 'object',
        properties: {
          businessName: { type: 'string' },
          businessEmail: { type: 'string', format: 'email' },
          timezone: { type: 'string' },
          currency: { type: 'string' },
          theme: {
            type: 'object',
            properties: {
              primaryColor: { type: 'string' },
              secondaryColor: { type: 'string' },
              fontFamily: { type: 'string' }
            }
          },
          features: {
            type: 'object',
            properties: {
              aiGeneration: { type: 'boolean' },
              onlineClasses: { type: 'boolean' },
              bookingSystem: { type: 'boolean' }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          message: { type: 'string' },
          statusCode: { type: 'number' }
        }
      }
    }
  },
  tags: [
    { name: 'Auth', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User management endpoints' },
    { name: 'Yoga Plans', description: 'Yoga plan management' },
    { name: 'AI', description: 'AI generation endpoints' },
    { name: 'Events', description: 'Event and class management' },
    { name: 'Settings', description: 'Platform settings' },
    { name: 'Health', description: 'Health check endpoints' }
  ]
};

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js', './server.js'] // Path to the API routes
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;