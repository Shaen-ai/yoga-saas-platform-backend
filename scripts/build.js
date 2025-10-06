#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔨 Building Yoga Backend...\n');

// Check environment
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('⚠️  No .env file found. Creating from .env.example...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created. Please update with your configuration.\n');
  } else {
    console.log('⚠️  Warning: No .env file found. Using default configuration.\n');
  }
}

// Validate required files
const requiredFiles = [
  'server.js',
  'middleware/tenantMiddleware.js',
  'middleware/wixAuth.js',
  'routes/events.js',
  'routes/users.js',
  'routes/settings.js',
  'routes/yoga-plans.js',
  'routes/analytics.js',
  'routes/ai-generation.js',
  'routes/instructors.js',
  'routes/notifications.js',
  'routes/reviews.js',
  'routes/subscriptions.js'
];

console.log('📋 Validating required files...');
let hasErrors = false;

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    hasErrors = true;
  }
});

if (!hasErrors) {
  console.log('✅ All required files present\n');
}

// Check node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

if (majorVersion < 14) {
  console.error(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 14 or higher.\n`);
  process.exit(1);
}

console.log(`✅ Node.js version: ${nodeVersion}`);

// Validate package.json dependencies
console.log('\n📦 Checking dependencies...');
const packageJson = require('../package.json');
const requiredDeps = ['express', 'cors', 'dotenv'];

requiredDeps.forEach(dep => {
  if (!packageJson.dependencies[dep]) {
    console.error(`❌ Missing required dependency: ${dep}`);
    hasErrors = true;
  }
});

if (!hasErrors) {
  console.log('✅ All required dependencies present');
}

// Create necessary directories
const directories = ['logs', 'temp', 'uploads'];
console.log('\n📁 Creating necessary directories...');

directories.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Final status
if (hasErrors) {
  console.error('\n❌ Build failed with errors. Please fix the issues above.\n');
  process.exit(1);
} else {
  console.log('\n✅ Build completed successfully!');
  console.log('📌 You can now run "npm start" to launch the server.\n');
  process.exit(0);
}