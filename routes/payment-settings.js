const express = require('express');
const router = express.Router();

// In-memory storage for payment settings (replace with database in production)
let paymentSettings = {
  stripe: {
    enabled: false,
    publishableKey: '',
    secretKey: '',
    webhookSecret: ''
  },
  paypal: {
    enabled: false,
    email: '',
    currency: 'USD',
    description: 'Yoga Class Payment',
    clientId: '',
    clientSecret: '',
    mode: 'sandbox'
  },
  razorpay: {
    enabled: false,
    keyId: '',
    keySecret: '',
    webhookSecret: ''
  },
  bankTransfer: {
    enabled: false,
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    swiftCode: '',
    instructions: ''
  },
  cash: {
    enabled: false,
    instructions: ''
  },
  upi: {
    enabled: false,
    upiId: '',
    qrCode: ''
  },
  general: {
    currency: 'USD',
    taxRate: 0,
    minimumAmount: 10,
    transactionFee: 0,
    autoCapture: true
  },
  tax: {
    enableTax: false,
    taxNumber: '',
    companyName: '',
    companyAddress: '',
    invoicePrefix: 'INV-',
    invoiceFooter: ''
  }
};

// GET all payment settings
router.get('/', (req, res) => {
  // Mask sensitive data before sending
  const maskedSettings = JSON.parse(JSON.stringify(paymentSettings));
  
  // Mask Stripe keys
  if (maskedSettings.stripe.secretKey) {
    maskedSettings.stripe.secretKey = '****' + maskedSettings.stripe.secretKey.slice(-4);
  }
  if (maskedSettings.stripe.webhookSecret) {
    maskedSettings.stripe.webhookSecret = '****' + maskedSettings.stripe.webhookSecret.slice(-4);
  }
  
  // Mask PayPal secret
  if (maskedSettings.paypal.clientSecret) {
    maskedSettings.paypal.clientSecret = '****' + maskedSettings.paypal.clientSecret.slice(-4);
  }
  
  // Mask Razorpay secret
  if (maskedSettings.razorpay.keySecret) {
    maskedSettings.razorpay.keySecret = '****' + maskedSettings.razorpay.keySecret.slice(-4);
  }
  if (maskedSettings.razorpay.webhookSecret) {
    maskedSettings.razorpay.webhookSecret = '****' + maskedSettings.razorpay.webhookSecret.slice(-4);
  }
  
  // Mask bank account number
  if (maskedSettings.bankTransfer.accountNumber) {
    maskedSettings.bankTransfer.accountNumber = '****' + maskedSettings.bankTransfer.accountNumber.slice(-4);
  }
  
  res.json(maskedSettings);
});

// UPDATE payment settings
router.post('/', (req, res) => {
  const updates = req.body;
  
  // Only update provided fields, preserve existing sensitive data if masked
  Object.keys(updates).forEach(provider => {
    if (paymentSettings[provider]) {
      Object.keys(updates[provider]).forEach(field => {
        // Don't update if the value is masked (starts with ****)
        if (typeof updates[provider][field] === 'string' && updates[provider][field].startsWith('****')) {
          // Keep existing value
        } else {
          paymentSettings[provider][field] = updates[provider][field];
        }
      });
    }
  });
  
  res.json({ 
    success: true, 
    message: 'Payment settings updated successfully' 
  });
});

// GET enabled payment methods (public endpoint for widget)
router.get('/enabled', (req, res) => {
  const enabledMethods = [];
  
  if (paymentSettings.stripe.enabled) {
    enabledMethods.push({
      type: 'stripe',
      publishableKey: paymentSettings.stripe.publishableKey,
      currency: paymentSettings.general.currency
    });
  }
  
  if (paymentSettings.paypal.enabled) {
    enabledMethods.push({
      type: 'paypal',
      email: paymentSettings.paypal.email,
      currency: paymentSettings.paypal.currency || paymentSettings.general.currency,
      description: paymentSettings.paypal.description || 'Yoga Class Payment',
      clientId: paymentSettings.paypal.clientId,
      mode: paymentSettings.paypal.mode
    });
  }
  
  if (paymentSettings.razorpay.enabled) {
    enabledMethods.push({
      type: 'razorpay',
      keyId: paymentSettings.razorpay.keyId,
      currency: paymentSettings.general.currency
    });
  }
  
  if (paymentSettings.bankTransfer.enabled) {
    enabledMethods.push({
      type: 'bankTransfer',
      bankName: paymentSettings.bankTransfer.bankName,
      accountName: paymentSettings.bankTransfer.accountName,
      instructions: paymentSettings.bankTransfer.instructions
    });
  }
  
  if (paymentSettings.cash.enabled) {
    enabledMethods.push({
      type: 'cash',
      instructions: paymentSettings.cash.instructions
    });
  }
  
  if (paymentSettings.upi.enabled) {
    enabledMethods.push({
      type: 'upi',
      upiId: paymentSettings.upi.upiId,
      qrCode: paymentSettings.upi.qrCode
    });
  }
  
  res.json({
    methods: enabledMethods,
    general: {
      currency: paymentSettings.general.currency,
      minimumAmount: paymentSettings.general.minimumAmount,
      taxRate: paymentSettings.general.taxRate
    }
  });
});

module.exports = router;