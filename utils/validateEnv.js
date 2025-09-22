/**
 * Environment Variables Validation
 * Ensures all required environment variables are set for production
 */

const validateEnvironment = () => {
  const errors = [];
  const warnings = [];

  const isProduction = process.env.NODE_ENV === 'production';

  // Required in production
  if (isProduction) {
    // Database
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('your-')) {
      errors.push('MONGODB_URI must be configured with a valid MongoDB connection string');
    }

    if (process.env.SKIP_DB === 'true') {
      errors.push('SKIP_DB must be false or undefined in production');
    }

    // Authentication
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'dev-secret-key-change-in-production') {
      errors.push('JWT_SECRET must be a strong, unique secret key in production');
    }

    if (process.env.BYPASS_AUTH === 'true') {
      errors.push('BYPASS_AUTH must be false in production');
    }

    // Wix Authentication
    if (!process.env.WIX_APP_ID || process.env.WIX_APP_ID.includes('your-')) {
      errors.push('WIX_APP_ID must be configured with your actual Wix App ID');
    }

    if (!process.env.WIX_APP_SECRET || process.env.WIX_APP_SECRET.includes('your-')) {
      errors.push('WIX_APP_SECRET must be configured with your actual Wix App Secret');
    }

    if (process.env.SKIP_WIX_AUTH === 'true') {
      warnings.push('SKIP_WIX_AUTH is true - Wix authentication is disabled');
    }
  }

  // General validations
  if (process.env.PORT && isNaN(process.env.PORT)) {
    errors.push('PORT must be a valid number');
  }

  // Email configuration (optional but warn if partially configured)
  if (process.env.EMAIL_SERVICE && (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD)) {
    warnings.push('Email service is configured but EMAIL_USER or EMAIL_PASSWORD is missing');
  }

  // Log results
  if (errors.length > 0) {
    console.error('\n❌ Environment Validation Failed:');
    errors.forEach(error => console.error(`   - ${error}`));

    if (isProduction) {
      console.error('\n🛑 Cannot start server in production with invalid configuration\n');
      process.exit(1);
    } else {
      console.log('\n⚠️  Fix these issues before deploying to production\n');
    }
  }

  if (warnings.length > 0) {
    console.warn('\n⚠️  Environment Warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
    console.log('');
  }

  if (errors.length === 0 && warnings.length === 0 && isProduction) {
    console.log('✅ Environment validation passed - ready for production\n');
  }
};

module.exports = validateEnvironment;