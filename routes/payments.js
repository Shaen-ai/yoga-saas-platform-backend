const express = require('express');
const router = express.Router();
const axios = require('axios');
const { addTenantFilter } = require('../middleware/tenantMiddleware');
const Event = require('../models/Event');
const Payment = require('../models/Payment');
const Registration = require('../models/Registration');

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_API_URL = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Get PayPal access token
async function getPayPalAccessToken() {
  try {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    const response = await axios.post(
      `${PAYPAL_API_URL}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting PayPal access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with PayPal');
  }
}

// Create PayPal order
router.post('/create-order', async (req, res) => {
  try {
    const { eventId, userName, userEmail } = req.body;
    const tenantKey = req.tenantKey || 'default';

    console.log('Creating PayPal order for event:', eventId);

    // Get event details
    const event = await Event.findOne({ _id: eventId, tenantKey });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check if payment is required
    if (!event.requiresPayment) {
      return res.status(400).json({ error: 'Payment not required for this event' });
    }

    // Check if event has space
    if (event.participants.length >= event.maxParticipants) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: eventId,
        description: `${event.title} - ${new Date(event.start).toLocaleDateString()}`,
        amount: {
          currency_code: event.currency || 'USD',
          value: event.price.toFixed(2)
        },
        custom_id: JSON.stringify({
          eventId,
          tenantKey,
          userName,
          userEmail
        })
      }],
      application_context: {
        brand_name: 'Yoga Studio',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/cancel`
      }
    };

    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('PayPal order created:', response.data.id);

    // Create payment record
    const payment = new Payment({
      eventId: event._id,
      eventTitle: event.title,
      userName,
      userEmail,
      amount: event.price,
      currency: event.currency || 'USD',
      paymentMethod: 'paypal',
      status: 'pending',
      paymentGatewayId: response.data.id,
      paymentGatewayData: response.data,
      tenantKey
    });
    await payment.save();

    res.json({
      orderId: response.data.id,
      approvalUrl: response.data.links.find(link => link.rel === 'approve')?.href
    });

  } catch (error) {
    console.error('Error creating PayPal order:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create payment order',
      details: error.response?.data || error.message
    });
  }
});

// Capture PayPal order
router.post('/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    const tenantKey = req.tenantKey || 'default';

    console.log('Capturing PayPal order:', orderId);

    // Get payment record
    const payment = await Payment.findOne({
      paymentGatewayId: orderId,
      tenantKey
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Capture the order
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('PayPal order captured:', response.data);

    // Update payment record
    payment.status = 'completed';
    payment.paidAt = new Date();
    payment.transactionId = response.data.purchase_units[0]?.payments?.captures[0]?.id;
    payment.payerInfo = {
      payerId: response.data.payer?.payer_id,
      email: response.data.payer?.email_address,
      name: response.data.payer?.name?.given_name + ' ' + response.data.payer?.name?.surname
    };
    payment.paymentGatewayData = response.data;
    await payment.save();

    // Add participant to event
    const event = await Event.findById(payment.eventId);
    if (event) {
      // Check if user already registered
      const existingParticipant = event.participants.find(
        p => p.email === payment.userEmail
      );

      if (!existingParticipant) {
        event.participants.push({
          userId: payment.userId || `guest_${Date.now()}`,
          name: payment.userName,
          email: payment.userEmail,
          registeredAt: new Date(),
          paymentStatus: 'paid',
          paymentId: payment._id,
          paymentAmount: payment.amount,
          paidAt: payment.paidAt
        });

        // Update total revenue
        event.totalRevenue = (event.totalRevenue || 0) + payment.amount;

        await event.save();
        console.log('Participant added to event:', event._id);
      }
    }

    res.json({
      success: true,
      paymentId: payment._id,
      transactionId: payment.transactionId,
      event: {
        id: event._id,
        title: event.title,
        start: event.start
      }
    });

  } catch (error) {
    console.error('Error capturing PayPal order:', error.response?.data || error.message);

    // Update payment status to failed
    if (req.body.orderId) {
      await Payment.findOneAndUpdate(
        { paymentGatewayId: req.body.orderId },
        {
          status: 'failed',
          failedAt: new Date(),
          failureReason: error.response?.data?.message || error.message
        }
      );
    }

    res.status(500).json({
      error: 'Failed to capture payment',
      details: error.response?.data || error.message
    });
  }
});

// Get payment details
router.get('/payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const tenantKey = req.tenantKey || 'default';

    const payment = await Payment.findOne({ _id: paymentId, tenantKey })
      .populate('eventId');

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Get all payments for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const tenantKey = req.tenantKey || 'default';

    const payments = await Payment.find({
      eventId,
      tenantKey,
      status: 'completed'
    }).sort({ paidAt: -1 });

    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);

    res.json({
      payments,
      totalRevenue,
      totalTransactions: payments.length
    });
  } catch (error) {
    console.error('Error fetching event payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Refund payment
router.post('/refund', async (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    const tenantKey = req.tenantKey || 'default';

    console.log('Refunding payment:', paymentId);

    // Get payment record
    const payment = await Payment.findOne({ _id: paymentId, tenantKey });
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed payments can be refunded' });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Refund the capture
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/payments/captures/${payment.transactionId}/refund`,
      {
        note_to_payer: reason || 'Refund for event cancellation'
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('PayPal refund processed:', response.data);

    // Update payment record
    payment.status = 'refunded';
    payment.refundId = response.data.id;
    payment.refundAmount = payment.amount;
    payment.refundedAt = new Date();
    payment.refundReason = reason;
    await payment.save();

    // Update participant status in event
    const event = await Event.findById(payment.eventId);
    if (event) {
      const participant = event.participants.find(p => p.email === payment.userEmail);
      if (participant) {
        participant.paymentStatus = 'refunded';
      }
      event.totalRevenue = (event.totalRevenue || 0) - payment.amount;
      await event.save();
    }

    res.json({
      success: true,
      refundId: response.data.id,
      amount: payment.amount
    });

  } catch (error) {
    console.error('Error refunding payment:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to process refund',
      details: error.response?.data || error.message
    });
  }
});

// Get payment statistics
router.get('/stats', async (req, res) => {
  try {
    const tenantKey = req.tenantKey || 'default';

    const stats = await Payment.aggregate([
      { $match: { tenantKey, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransactionValue: { $avg: '$amount' }
        }
      }
    ]);

    const recentPayments = await Payment.find({
      tenantKey,
      status: 'completed'
    })
      .sort({ paidAt: -1 })
      .limit(10)
      .populate('eventId', 'title start');

    res.json({
      stats: stats[0] || { totalRevenue: 0, totalTransactions: 0, avgTransactionValue: 0 },
      recentPayments
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

// PayPal IPN endpoint to confirm payment
router.post('/paypal-ipn', async (req, res) => {
  try {
    console.log('PayPal IPN received:', req.body);

    // Acknowledge receipt immediately
    res.status(200).send('OK');

    // Verify IPN with PayPal (recommended for production)
    const verificationBody = 'cmd=_notify-validate&' + Object.keys(req.body)
      .map(key => `${key}=${encodeURIComponent(req.body[key])}`)
      .join('&');

    try {
      const verification = await axios.post(
        'https://www.paypal.com/cgi-bin/webscr',
        verificationBody,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      if (verification.data !== 'VERIFIED') {
        console.error('PayPal IPN verification failed:', verification.data);
        return;
      }
    } catch (verifyError) {
      console.error('PayPal IPN verification error:', verifyError.message);
      // Continue processing even if verification fails (for development)
    }

    // Extract data from IPN
    const paymentStatus = req.body.payment_status;
    const transactionId = req.body.txn_id;
    const payerId = req.body.payer_id;
    const grossAmount = parseFloat(req.body.mc_gross);
    const currency = req.body.mc_currency;

    // Extract custom data (contains registration ID)
    let customData;
    try {
      customData = JSON.parse(req.body.custom);
    } catch (e) {
      console.error('Failed to parse custom data:', e);
      return;
    }

    const registrationId = customData.registrationId;

    if (!registrationId) {
      console.error('No registration ID in IPN custom data');
      return;
    }

    // Find the registration
    const registration = await Registration.findById(registrationId);

    if (!registration) {
      console.error(`Registration not found: ${registrationId}`);
      return;
    }

    // Update registration based on payment status
    if (paymentStatus === 'Completed') {
      registration.paymentCompleted = true;
      registration.status = 'confirmed';
      registration.paypalTransactionId = transactionId;
      registration.paypalPayerId = payerId;
      registration.paypalPaymentStatus = paymentStatus;
      registration.paymentConfirmedAt = new Date();

      await registration.save();

      console.log(`✅ Payment confirmed for registration ${registrationId}`);
      console.log(`   Transaction: ${transactionId}, Amount: ${grossAmount} ${currency}`);
    } else if (paymentStatus === 'Refunded' || paymentStatus === 'Reversed') {
      registration.status = 'refunded';
      registration.paypalPaymentStatus = paymentStatus;

      await registration.save();

      console.log(`🔄 Payment ${paymentStatus.toLowerCase()} for registration ${registrationId}`);
    } else {
      console.log(`ℹ️  Payment status "${paymentStatus}" for registration ${registrationId}`);
      registration.paypalPaymentStatus = paymentStatus;
      await registration.save();
    }

  } catch (error) {
    console.error('Error processing PayPal IPN:', error);
  }
});

// Manual payment confirmation endpoint (for testing/admin)
router.post('/confirm-payment/:registrationId', async (req, res) => {
  try {
    const { registrationId } = req.params;

    const registration = await Registration.findById(registrationId);

    if (!registration) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    if (registration.paymentCompleted) {
      return res.status(400).json({ error: 'Payment already confirmed' });
    }

    registration.paymentCompleted = true;
    registration.status = 'confirmed';
    registration.paymentConfirmedAt = new Date();
    await registration.save();

    console.log(`Manual payment confirmation for registration ${registrationId}`);

    res.json({
      message: 'Payment confirmed successfully',
      registration
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

module.exports = router;
