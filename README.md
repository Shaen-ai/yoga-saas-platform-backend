# Backend - REST API

Node.js Express server that handles all data operations for the Yoga SaaS Platform.

## 📁 Folder Structure

```
backend/
├── models/              # MongoDB schemas (data structure)
│   ├── Event.js        # Event/class schema with recurring support
│   └── YogaPlan.js     # Yoga plan schema
│
├── routes/             # API endpoints (your "actions")
│   ├── events.js       # All event operations (CRUD)
│   ├── yoga-plans.js   # Yoga plan generation & approval
│   ├── settings.js     # UI settings and preferences
│   ├── analytics.js    # Usage analytics
│   └── ai-generation.js # AI plan generation
│
├── middleware/         # Code that runs before routes
│   └── auth.js         # Authentication (Wix integration)
│
├── utils/              # Helper functions
│   └── ai.js          # AI integration for plan generation
│
├── .env               # Configuration (DB password, API keys)
├── server.js          # Main entry point - START HERE
└── package.json       # Dependencies list
```

## 🎯 Start Here: `server.js`

This is the **main file** that starts everything. Read it top to bottom:

```javascript
// 1. Import libraries
const express = require('express');
const mongoose = require('mongoose');

// 2. Create app
const app = express();

// 3. Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// 4. Load routes (API endpoints)
app.use('/api/events', require('./routes/events'));
app.use('/api/yoga-plans', require('./routes/yoga-plans'));

// 5. Start server
app.listen(8000);
```

**That's it!** Everything else is just details.

## 🗄️ Models (Data Structure)

Models define what data looks like in MongoDB.

### `models/Event.js`

Defines an event (class, workshop, retreat):

```javascript
{
  title: "Morning Yoga",           // Required
  start: "2025-10-07T08:00:00",   // Required (Date)
  end: "2025-10-07T09:00:00",     // Required (Date)

  // Basic info
  description: "Relaxing flow",
  instructor: "John Doe",
  maxParticipants: 20,

  // Categorization
  type: "class",                   // class, workshop, retreat, private
  category: "vinyasa",
  level: "beginner",

  // Recurring pattern (NEW - reduces duplicate events)
  isRecurring: true,
  recurrencePattern: {
    frequency: "weekly",           // daily, weekly, monthly, yearly
    interval: 1,                   // every X weeks
    daysOfWeek: [1, 3, 5],        // Mon, Wed, Fri
    occurrences: 12                // repeat 12 times
  },

  // Visibility & approval
  approvalStatus: "approved",      // pending_approval, approved, rejected
  isVisible: true,                 // show/hide in widget

  // Participants
  participants: [{
    userId: "user123",
    name: "Jane Smith",
    email: "jane@example.com"
  }],

  // Multi-tenant
  tenantKey: "default"             // for supporting multiple studios
}
```

### `models/YogaPlan.js`

Defines a personalized yoga plan:

```javascript
{
  userId: "user@email.com",        // Required

  // User's form data
  formData: {
    experience: "beginner",
    goals: ["flexibility", "stress"],
    availableTime: 30,             // minutes per session
    frequency: 3                   // sessions per week
  },

  // Generated sessions
  sessions: [
    {
      week: 1,
      day: 1,
      duration: 30,
      focus: "Foundation",
      intensity: "gentle",
      poses: ["Mountain Pose", "Downward Dog"]
    }
  ],

  // Approval workflow
  status: "pending_approval",      // pending_approval, approved, rejected
  approvedBy: "admin@example.com",
  approvedAt: "2025-10-07T10:00:00",

  tenantKey: "default"
}
```

## 🛣️ Routes (API Endpoints)

Routes define what URLs do. Each route file handles one resource.

### `routes/events.js` - Event Operations

| Method | Endpoint | Purpose | Body |
|--------|----------|---------|------|
| GET | `/api/events` | Get all events | - |
| GET | `/api/events/:id` | Get one event | - |
| POST | `/api/events` | Create event | Event object |
| PUT | `/api/events/:id` | Update event | Event object |
| DELETE | `/api/events/:id` | Delete event | - |
| PUT | `/api/events/:id/approve` | Approve event | - |
| PUT | `/api/events/:id/reject` | Reject event | `{ reason }` |
| PUT | `/api/events/:id/toggle-visibility` | Show/hide event | - |
| POST | `/api/events/:id/register` | Register for event | User data |

**Example**: Get all events
```javascript
// Request
GET http://localhost:8000/api/events

// Response
{
  events: [
    { _id: "123", title: "Morning Yoga", ... },
    { _id: "456", title: "Evening Flow", ... }
  ],
  total: 2
}
```

### `routes/yoga-plans.js` - Yoga Plan Operations

| Method | Endpoint | Purpose | Body |
|--------|----------|---------|------|
| POST | `/api/yoga-plans/generate` | Generate new plan with AI | Form data |
| GET | `/api/yoga-plans` | Get all plans | - |
| GET | `/api/yoga-plans/user/:userId` | Get user's plans | - |
| PUT | `/api/yoga-plans/:id/approve` | Approve plan | - |
| PUT | `/api/yoga-plans/:id/reject` | Reject plan | `{ reason }` |

**Example**: Generate plan
```javascript
// Request
POST http://localhost:8000/api/yoga-plans/generate
{
  email: "user@example.com",
  experience: "beginner",
  goals: ["flexibility"],
  availableTime: 30,
  frequency: 3
}

// Response
{
  message: "Plan generated",
  plan: { _id: "789", sessions: [...], status: "pending_approval" }
}
```

**Important**: When a plan is approved, it automatically creates recurring events!

### `routes/settings.js` - UI Settings

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/settings/ui` | Get widget settings (colors, theme, language) |

## 🔄 Key Workflows Explained

### Workflow: User Generates Yoga Plan

1. **Widget** sends POST to `/api/yoga-plans/generate` with form data
2. **Backend** calls AI to generate personalized sessions
3. **Backend** saves plan to `yogaplans` collection (status: `pending_approval`)
4. **Backend** creates recurring events (status: `pending_approval`, `isVisible: false`)
5. Admin approves plan via PUT `/api/yoga-plans/:id/approve`
6. **Backend** updates plan status to `approved`
7. **Backend** updates associated events to `approved` and `isVisible: true`
8. Events now appear in widget calendar

### Workflow: Admin Creates Event

1. **Dashboard** sends POST to `/api/events` with event data
2. **Backend** saves to `events` collection (status: `approved`, `isVisible: true`)
3. Event immediately shows in **Widget**

## 🔧 Common Tasks

### Add a new field to events

1. Open `models/Event.js`
2. Add field to schema:
```javascript
const eventSchema = new mongoose.Schema({
  // ... existing fields
  myNewField: {
    type: String,
    default: 'default value'
  }
});
```
3. Use in routes:
```javascript
const event = new Event({
  title: req.body.title,
  myNewField: req.body.myNewField  // New!
});
```

### Add a new API endpoint

1. Open relevant route file (e.g., `routes/events.js`)
2. Add route:
```javascript
router.get('/my-endpoint', async (req, res) => {
  try {
    // Your logic here
    const data = await Event.find({ /* query */ });
    res.json({ data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Debug database queries

Add console.logs in routes:
```javascript
router.get('/', async (req, res) => {
  const events = await Event.find({});
  console.log('Found events:', events.length);  // Debug!
  res.json({ events });
});
```

## 🌍 Environment Variables

Edit `.env` file:

```bash
# Database
MONGODB_URI=mongodb+srv://user:password@cluster.pyjnbkm.mongodb.net/yoga_saas

# Server
PORT=8000

# AI (if using Claude AI)
ANTHROPIC_API_KEY=your_key_here

# Debug
SKIP_DB=false  # Set to true to skip database connection (for testing)
```

## 🚀 Running the Backend

### Development (auto-restart on changes)
```bash
npm run dev
```

### Production
```bash
npm start
```

### Test database connection
```bash
node -e "require('./server.js')"
```

## 🐛 Troubleshooting

### "MongooseError: Cannot connect"
- Check `MONGODB_URI` in `.env`
- Check MongoDB Atlas network access (IP: `87.241.157.10/32`)
- Check MongoDB Atlas database user password

### "Cannot find module"
```bash
npm install  # Install all dependencies
```

### Routes returning empty arrays
- Check if `tenantKey` matches (should be `'default'`)
- Check database in MongoDB Atlas web interface
- Add console.logs to see what's happening

## 📝 Code Style

**Good route handler**:
```javascript
// ✅ Good: Try-catch, proper status codes, helpful error message
router.post('/', async (req, res) => {
  try {
    const event = new Event({ ...req.body, tenantKey: req.tenantKey });
    await event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});
```

**Bad route handler**:
```javascript
// ❌ Bad: No error handling, no status code
router.post('/', async (req, res) => {
  const event = new Event(req.body);
  await event.save();
  res.json(event);
});
```

## 💡 For Junior Developers

**Mental Model**: Think of the backend as a waiter in a restaurant:
- **Routes** = Menu items (what customers can order)
- **Models** = Recipes (how dishes are made)
- **Database** = Kitchen storage (where ingredients are kept)
- **Middleware** = Quality checks (checking IDs before serving)

When dashboard/widget makes a request, it's "ordering from the menu". The backend finds the right route, follows the recipe (model), gets/saves data in the database, and sends back the result.

**Read code in this order**:
1. `server.js` - See how everything connects
2. `models/Event.js` - Understand data structure
3. `routes/events.js` - See how data is created/read/updated/deleted
4. Repeat for other models/routes
