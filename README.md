# Backend API

## 🎯 Purpose
Backend API server for the Yoga SaaS Platform. Provides RESTful endpoints for both the Dashboard and Widget applications.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the server
npm start

# Server will run on http://localhost:8000
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Yoga Plans
- `GET /api/yoga-plans` - List all plans
- `GET /api/yoga-plans/:id` - Get plan by ID
- `GET /api/yoga-plans/user/:userId` - Get user's plans
- `POST /api/yoga-plans/generate` - Generate new plan
- `PUT /api/yoga-plans/:id/approve` - Approve/reject plan

### AI Integration
- `POST /api/ai/generate-plan` - AI-powered plan generation
- `POST /api/ai/analyze-progress` - Progress analysis

## 🔧 Configuration

Environment variables in `.env`:

```env
PORT=8000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/yoga_saas
JWT_SECRET=your-secret-key
BYPASS_AUTH=true  # For development
```

## 🏗 Project Structure

```
backend/
├── server.js         # Main server file
├── routes/          # API routes
│   ├── auth.js
│   ├── users.js
│   ├── yoga-plans.js
│   └── ai-generation.js
├── middleware/      # Custom middleware
├── models/         # Data models
├── services/       # Business logic
├── package.json
└── .env
```

## 🔐 Authentication

- **Development Mode**: Set `BYPASS_AUTH=true` to skip authentication
- **Production Mode**: Uses JWT tokens for secure authentication

## 📦 Dependencies

- Express.js - Web framework
- CORS - Cross-origin resource sharing
- Helmet - Security headers
- JWT - Authentication tokens
- Bcrypt - Password hashing
- Rate Limiting - API protection

## 🚀 Deployment

Can be deployed to:
- Heroku
- AWS EC2/Lambda
- Google Cloud Run
- DigitalOcean
- Any Node.js hosting platform

## 📝 Notes

- Works without MongoDB (uses in-memory storage)
- Supports both Dashboard and Widget frontends
- Rate limited to prevent abuse
- CORS configured for local development