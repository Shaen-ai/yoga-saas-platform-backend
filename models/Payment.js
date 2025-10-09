const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Event and User Information
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  eventTitle: String,
  userId: String,
  userName: String,
  userEmail: {
    type: String,
    required: true
  },

  // Payment Details
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['paypal', 'stripe'],
    required: true
  },

  // Payment Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },

  // Payment Gateway Information
  paymentGatewayId: String, // PayPal Order ID or Stripe Payment Intent ID
  paymentGatewayData: mongoose.Schema.Types.Mixed, // Full response from payment gateway

  // Transaction Details
  transactionId: String,
  payerInfo: {
    payerId: String,
    email: String,
    name: String
  },

  // Refund Information
  refundId: String,
  refundAmount: Number,
  refundedAt: Date,
  refundReason: String,

  // Timestamps
  paidAt: Date,
  failedAt: Date,
  failureReason: String,

  // Tenant
  tenantKey: {
    type: String,
    required: true,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ tenantKey: 1, status: 1 });
paymentSchema.index({ tenantKey: 1, eventId: 1 });
paymentSchema.index({ userEmail: 1 });
paymentSchema.index({ paymentGatewayId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
