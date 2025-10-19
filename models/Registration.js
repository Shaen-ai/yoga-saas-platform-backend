const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  // Guest/User information
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: String,
  experience: String,
  specialRequirements: String,
  emergencyContact: String,

  // Payment information
  paymentCompleted: {
    type: Boolean,
    default: false
  },
  paymentMethod: {
    type: String,
    enum: ['free', 'paypal', 'stripe'],
    default: 'free'
  },
  paymentAmount: {
    type: Number,
    default: 0
  },
  paymentCurrency: {
    type: String,
    default: 'USD'
  },

  // PayPal specific data
  paypalTransactionId: String,
  paypalPayerId: String,
  paypalPaymentStatus: String,

  // Status tracking
  status: {
    type: String,
    enum: ['pending_payment', 'confirmed', 'cancelled', 'refunded'],
    default: 'pending_payment'
  },

  // Timestamps
  registeredAt: {
    type: Date,
    default: Date.now
  },
  paymentConfirmedAt: Date,
  cancelledAt: Date,

  // Multi-tenant support
  tenantKey: {
    type: String,
    required: true,
    default: 'default'
  }
}, {
  timestamps: true
});

// Index for faster queries
registrationSchema.index({ eventId: 1, email: 1 });
registrationSchema.index({ tenantKey: 1 });
registrationSchema.index({ paymentCompleted: 1 });
registrationSchema.index({ status: 1 });

const Registration = mongoose.model('Registration', registrationSchema);

module.exports = Registration;
