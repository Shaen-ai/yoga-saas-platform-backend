/**
 * Middleware for handling multi-tenant isolation using Wix parameters
 */

/**
 * Extract tenant information from request headers
 * @param {Object} req - Express request object
 * @returns {Object} Tenant information
 */
const extractTenantInfo = (req) => {
  const compId = req.headers['x-wix-comp-id'] || req.query.compId;
  const instance = req.headers['x-wix-instance'] || req.query.instance;
  const tenantId = req.headers['x-tenant-id'];

  // If we have an instance, try to extract additional information
  let instanceData = null;
  if (instance) {
    try {
      // Wix instance is base64 encoded JSON with signature
      const [encodedData] = instance.split('.');
      const decodedData = Buffer.from(encodedData, 'base64').toString('utf-8');
      instanceData = JSON.parse(decodedData);
    } catch (error) {
      console.error('Failed to decode Wix instance:', error);
    }
  }

  return {
    compId,
    instance,
    tenantId: tenantId || (instanceData && (instanceData.instanceId || instanceData.siteOwnerId || instanceData.uid)),
    instanceData
  };
};

/**
 * Middleware to attach tenant information to request
 */
const attachTenantInfo = (req, res, next) => {
  const tenantInfo = extractTenantInfo(req);

  // Attach tenant info to request object
  req.tenant = tenantInfo;

  // Create a unique tenant key for database operations
  if (tenantInfo.compId && tenantInfo.instance) {
    // If both compId and instance are 'default', use 'default' as tenant key
    // to maintain compatibility with dashboard
    if (tenantInfo.compId === 'default' && tenantInfo.instance === 'default') {
      req.tenantKey = 'default';
    } else {
      req.tenantKey = `${tenantInfo.compId}:${tenantInfo.instance}`;
    }
  } else if (tenantInfo.tenantId) {
    req.tenantKey = tenantInfo.tenantId;
  } else {
    // Default tenant for development/testing
    req.tenantKey = 'default';
  }

  console.log('Tenant middleware - Request tenant key:', req.tenantKey);
  next();
};

/**
 * Middleware to require tenant information
 * Use this for endpoints that must be tenant-scoped
 */
const requireTenant = (req, res, next) => {
  const tenantInfo = extractTenantInfo(req);

  // In development, allow requests without tenant info
  if (process.env.NODE_ENV === 'development' && process.env.BYPASS_AUTH === 'true') {
    req.tenant = tenantInfo;
    req.tenantKey = tenantInfo.compId && tenantInfo.instance
      ? `${tenantInfo.compId}:${tenantInfo.instance}`
      : 'default-dev';
    return next();
  }

  // In production, require tenant information
  if (!tenantInfo.compId || !tenantInfo.instance) {
    return res.status(401).json({
      error: 'Tenant information required',
      message: 'Missing Wix comp_id or instance'
    });
  }

  req.tenant = tenantInfo;
  req.tenantKey = `${tenantInfo.compId}:${tenantInfo.instance}`;
  next();
};

/**
 * Helper function to add tenant filter to database queries
 * @param {Object} query - Original query object
 * @param {String} tenantKey - Tenant key to filter by
 * @returns {Object} Query with tenant filter
 */
const addTenantFilter = (query, tenantKey) => {
  return {
    ...query,
    tenantKey
  };
};

/**
 * Helper function to add tenant key to data being saved
 * @param {Object} data - Data to be saved
 * @param {String} tenantKey - Tenant key
 * @returns {Object} Data with tenant key
 */
const addTenantToData = (data, tenantKey) => {
  return {
    ...data,
    tenantKey,
    updatedAt: new Date()
  };
};

module.exports = {
  extractTenantInfo,
  attachTenantInfo,
  requireTenant,
  addTenantFilter,
  addTenantToData
};