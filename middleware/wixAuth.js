const { createClient, ApiKeyStrategy } = require('@wix/sdk');
const { getAccessToken } = require('@wix/api-client');

// Store for elevated tokens (in production, use Redis or similar)
const tokenCache = new Map();

/**
 * Wix Authentication Middleware
 * Handles access token elevation and instance identification
 */
class WixAuthMiddleware {
  constructor() {
    this.appId = process.env.WIX_APP_ID;
    this.appSecret = process.env.WIX_APP_SECRET;

    if (!this.appId || !this.appSecret) {
      console.warn('WIX_APP_ID or WIX_APP_SECRET not configured. Running in development mode.');
    }
  }

  /**
   * Extract and elevate Wix access token
   */
  async elevateToken(accessToken) {
    if (!this.appSecret) {
      // Development mode - return mock elevated token
      return {
        instanceId: 'dev-instance',
        elevated: false,
        permissions: ['dev']
      };
    }

    // Check cache first
    const cached = tokenCache.get(accessToken);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      // Create Wix client with app credentials
      const client = createClient({
        auth: ApiKeyStrategy({
          siteId: '*', // All sites
          apiKey: this.appSecret
        })
      });

      // Elevate the token
      const elevated = await getAccessToken(client, {
        accessToken,
        appId: this.appId,
        appSecret: this.appSecret
      });

      // Cache the elevated token
      const data = {
        instanceId: elevated.instanceId,
        userId: elevated.userId,
        siteId: elevated.siteId,
        permissions: elevated.permissions || [],
        elevated: true
      };

      tokenCache.set(accessToken, {
        data,
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes
      });

      return data;
    } catch (error) {
      console.error('Token elevation failed:', error);
      throw new Error('Invalid or expired access token');
    }
  }

  /**
   * Middleware function to authenticate Wix requests
   */
  authenticate() {
    return async (req, res, next) => {
      // Skip in development mode if configured
      if (process.env.SKIP_WIX_AUTH === 'true') {
        req.wixAuth = {
          instanceId: 'dev-instance',
          elevated: false
        };
        return next();
      }

      // Extract access token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided - check for fallback tenant info
        if (req.headers['x-tenant-id'] || req.query.compId) {
          // Using legacy tenant identification
          req.wixAuth = {
            instanceId: req.headers['x-tenant-id'] || `${req.query.compId}_${req.query.instance}`,
            elevated: false,
            legacy: true
          };
          return next();
        }

        return res.status(401).json({
          error: 'No authentication token provided',
          details: 'Include Bearer token in Authorization header'
        });
      }

      const accessToken = authHeader.substring(7);

      try {
        // Elevate the token
        const authData = await this.elevateToken(accessToken);

        // Attach auth data to request
        req.wixAuth = authData;

        // Also set tenant info for backward compatibility
        req.tenantKey = authData.instanceId;
        req.tenantInfo = {
          instanceId: authData.instanceId,
          userId: authData.userId,
          siteId: authData.siteId
        };

        next();
      } catch (error) {
        console.error('Authentication failed:', error);
        res.status(401).json({
          error: 'Authentication failed',
          details: error.message
        });
      }
    };
  }

  /**
   * Middleware to require specific permissions
   */
  requirePermissions(...permissions) {
    return (req, res, next) => {
      if (!req.wixAuth) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const hasPermissions = permissions.every(p =>
        req.wixAuth.permissions && req.wixAuth.permissions.includes(p)
      );

      if (!hasPermissions) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: permissions,
          actual: req.wixAuth.permissions || []
        });
      }

      next();
    };
  }
}

// Export singleton instance
const wixAuth = new WixAuthMiddleware();

module.exports = {
  wixAuth,
  authenticate: wixAuth.authenticate.bind(wixAuth),
  requirePermissions: wixAuth.requirePermissions.bind(wixAuth)
};