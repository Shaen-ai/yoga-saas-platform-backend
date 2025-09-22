const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/wixAuth');

/**
 * @swagger
 * /api/wix-auth/verify:
 *   post:
 *     tags: [Wix Auth]
 *     summary: Verify and elevate Wix access token
 *     description: Verifies a Wix access token and returns elevated permissions
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 auth:
 *                   type: object
 *                   properties:
 *                     instanceId:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     siteId:
 *                       type: string
 *                     elevated:
 *                       type: boolean
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/verify', authenticate(), async (req, res) => {
  try {
    // Token is already verified and elevated by middleware
    res.json({
      success: true,
      auth: {
        instanceId: req.wixAuth.instanceId,
        userId: req.wixAuth.userId,
        siteId: req.wixAuth.siteId,
        elevated: req.wixAuth.elevated,
        permissions: req.wixAuth.permissions
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Token verification failed',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/wix-auth/instance:
 *   get:
 *     tags: [Wix Auth]
 *     summary: Get current instance information
 *     description: Returns information about the current Wix app instance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Instance information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 instanceId:
 *                   type: string
 *                 tenantKey:
 *                   type: string
 *                 siteId:
 *                   type: string
 *                 userId:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/instance', authenticate(), async (req, res) => {
  try {
    res.json({
      instanceId: req.wixAuth.instanceId,
      tenantKey: req.tenantKey,
      siteId: req.wixAuth.siteId,
      userId: req.wixAuth.userId
    });
  } catch (error) {
    console.error('Instance info error:', error);
    res.status(500).json({
      error: 'Failed to get instance information',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/wix-auth/webhook:
 *   post:
 *     tags: [Wix Auth]
 *     summary: Handle Wix webhooks
 *     description: Endpoint for receiving Wix app lifecycle webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [APP_INSTALLED, APP_UNINSTALLED, APP_UPGRADED]
 *               instanceId:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       500:
 *         description: Server error
 */
router.post('/webhook', async (req, res) => {
  const { eventType, instanceId, timestamp } = req.body;

  console.log('Wix webhook received:', {
    eventType,
    instanceId,
    timestamp
  });

  try {
    switch (eventType) {
      case 'APP_INSTALLED':
        // Handle app installation
        console.log(`App installed for instance: ${instanceId}`);
        // Initialize instance data in database
        // You might want to create initial settings, send welcome email, etc.
        break;

      case 'APP_UNINSTALLED':
        // Handle app uninstallation
        console.log(`App uninstalled for instance: ${instanceId}`);
        // Clean up instance data (mark as deleted, don't actually delete)
        break;

      case 'APP_UPGRADED':
        // Handle app upgrade
        console.log(`App upgraded for instance: ${instanceId}`);
        // Apply any migration or feature updates
        break;

      default:
        console.log(`Unknown webhook event: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      details: error.message
    });
  }
});

/**
 * @swagger
 * /api/wix-auth/config:
 *   get:
 *     tags: [Wix Auth]
 *     summary: Get Wix app configuration
 *     description: Returns public configuration needed for Wix integration
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appId:
 *                   type: string
 *                 redirectUrl:
 *                   type: string
 *                 webhookUrl:
 *                   type: string
 */
router.get('/config', (req, res) => {
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:8000';

  res.json({
    appId: process.env.WIX_APP_ID || 'YOUR_APP_ID',
    redirectUrl: `${baseUrl}/api/wix-auth/callback`,
    webhookUrl: `${baseUrl}/api/wix-auth/webhook`,
    instructions: {
      step1: 'Add WIX_APP_ID and WIX_APP_SECRET to your .env file',
      step2: 'Configure these URLs in your Wix app settings:',
      webhookEndpoint: `${baseUrl}/api/wix-auth/webhook`,
      redirectUrl: `${baseUrl}/api/wix-auth/callback`
    }
  });
});

module.exports = router;