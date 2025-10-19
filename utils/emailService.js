const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  const port = parseInt(process.env.EMAIL_PORT || '587');
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtpout.secureserver.net',
    port: port,
    secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.EMAIL_USER || 'info@nextechspires.com',
      pass: process.env.EMAIL_PASSWORD
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    },
    requireTLS: port === 587, // Only require STARTTLS for port 587
    debug: true, // Enable debug output
    logger: true // Log to console
  });
};

// Generate registration confirmation email HTML
const generateRegistrationConfirmationEmail = (registrationData, eventData, adminEmail) => {
  const { name, email, phone, experience, specialRequirements } = registrationData;
  const { title, start, end, instructor, location, price, currency, requiresPayment } = eventData;

  const eventDate = new Date(start).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const eventTime = `${new Date(start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })} - ${new Date(end).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4A90A4 0%, #2E5266 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🧘 Registration Confirmed!
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                Thank you for registering
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                Hello <strong>${name}</strong>,
              </p>

              <p style="margin: 0 0 30px; color: #333333; font-size: 16px; line-height: 1.6;">
                ${requiresPayment
                  ? `Your registration for <strong>${title}</strong> has been received and is pending payment confirmation. Please complete the payment to confirm your spot.`
                  : `Your registration for <strong>${title}</strong> has been confirmed! We're excited to see you at the class.`
                }
              </p>

              <!-- Event Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; color: #2E5266; font-size: 20px; font-weight: 600;">
                      📅 Event Details
                    </h2>

                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Event:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${title}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Date:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${eventDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Time:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${eventTime}</td>
                      </tr>
                      ${instructor ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Instructor:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${instructor}</td>
                      </tr>
                      ` : ''}
                      ${location ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Location:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${location}</td>
                      </tr>
                      ` : ''}
                      ${requiresPayment ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Price:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          <span style="background-color: #28a745; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600;">
                            ${currency || 'USD'} ${price?.toFixed(2) || '0.00'}
                          </span>
                        </td>
                      </tr>
                      ` : `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Price:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          <span style="background-color: #6c757d; color: white; padding: 4px 12px; border-radius: 4px;">
                            Free
                          </span>
                        </td>
                      </tr>
                      `}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Your Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; color: #2E5266; font-size: 20px; font-weight: 600;">
                      👤 Your Details
                    </h2>

                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Name:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${name}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Email:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${email}</td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Phone:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${phone}</td>
                      </tr>
                      ` : ''}
                      ${experience ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Experience:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-transform: capitalize;">${experience}</td>
                      </tr>
                      ` : ''}
                      ${specialRequirements ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; vertical-align: top;"><strong>Special Requirements:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${specialRequirements}</td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              ${requiresPayment ? `
              <!-- Payment Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-radius: 8px; border: 1px solid #ffc107; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                      <strong>⚠️ Payment Pending:</strong> Please complete your payment to confirm your registration. Your spot will be reserved once payment is confirmed.
                    </p>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- What to Bring -->
              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #2E5266; font-size: 18px; font-weight: 600;">
                  📋 What to Bring
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #333333; font-size: 14px; line-height: 1.8;">
                  <li>Yoga mat (or we can provide one)</li>
                  <li>Comfortable clothing</li>
                  <li>Water bottle</li>
                  <li>Towel</li>
                  <li>Open mind and positive energy ✨</li>
                </ul>
              </div>

              <!-- Contact Info -->
              <div style="padding: 20px; background-color: #e7f3f5; border-left: 4px solid #4A90A4; border-radius: 4px;">
                <p style="margin: 0 0 10px; color: #333333; font-size: 14px; line-height: 1.6;">
                  <strong>Questions or need to cancel?</strong>
                </p>
                <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                  Please reply to this email${adminEmail ? ` or contact us at <a href="mailto:${adminEmail}" style="color: #4A90A4; text-decoration: none;">${adminEmail}</a>` : ''}.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                We look forward to seeing you! 🙏
              </p>
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated confirmation email. Please do not reply directly to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Generate admin notification email HTML
const generateAdminNotificationEmail = (registrationData, eventData) => {
  const { name, email, phone, experience, specialRequirements, emergencyContact } = registrationData;
  const { title, start, end, requiresPayment, price, currency } = eventData;

  const eventDate = new Date(start).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const eventTime = `${new Date(start).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })} - ${new Date(end).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Registration</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2E5266 0%, #4A90A4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                🔔 New Registration
              </h1>
              <p style="margin: 10px 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                Someone just registered for an event
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">

              <!-- Event Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; color: #2E5266; font-size: 20px; font-weight: 600;">
                      📅 Event Information
                    </h2>

                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; width: 140px;"><strong>Event:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${title}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Date:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${eventDate}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Time:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${eventTime}</td>
                      </tr>
                      ${requiresPayment ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Payment Status:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          <span style="background-color: #ffc107; color: #333; padding: 4px 12px; border-radius: 4px; font-weight: 600;">
                            ⏳ Pending Payment (${currency || 'USD'} ${price?.toFixed(2) || '0.00'})
                          </span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Registrant Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #e7f3f5; border-radius: 8px; border: 1px solid #4A90A4; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px; color: #2E5266; font-size: 20px; font-weight: 600;">
                      👤 Registrant Information
                    </h2>

                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; width: 140px;"><strong>Name:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${name}</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Email:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          <a href="mailto:${email}" style="color: #4A90A4; text-decoration: none;">${email}</a>
                        </td>
                      </tr>
                      ${phone ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Phone:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          <a href="tel:${phone}" style="color: #4A90A4; text-decoration: none;">${phone}</a>
                        </td>
                      </tr>
                      ` : ''}
                      ${experience ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Experience Level:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0; text-transform: capitalize;">
                          <span style="background-color: #6c757d; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px;">
                            ${experience}
                          </span>
                        </td>
                      </tr>
                      ` : ''}
                      ${emergencyContact ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Emergency Contact:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">${emergencyContact}</td>
                      </tr>
                      ` : ''}
                      ${specialRequirements ? `
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0; vertical-align: top;"><strong>Special Requirements:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          <div style="background-color: white; padding: 10px; border-radius: 4px; border-left: 3px solid #ffc107;">
                            ${specialRequirements}
                          </div>
                        </td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #666666; font-size: 14px; padding: 8px 0;"><strong>Registered At:</strong></td>
                        <td style="color: #333333; font-size: 14px; padding: 8px 0;">
                          ${new Date().toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Quick Actions -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="http://localhost:3001/admin/events"
                       style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #4A90A4 0%, #2E5266 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                      View in Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This is an automated notification from your Yoga Studio Management System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Send registration confirmation to user
const sendRegistrationConfirmation = async (registrationData, eventData, adminEmail) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"Yoga Studio" <${process.env.EMAIL_USER || 'info@nextechspires.com'}>`,
      to: registrationData.email,
      replyTo: adminEmail || process.env.EMAIL_USER,
      subject: `Registration Confirmation - ${eventData.title}`,
      html: generateRegistrationConfirmationEmail(registrationData, eventData, adminEmail)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Registration confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending registration confirmation email:', error);
    throw error;
  }
};

// Send notification to admin
const sendAdminNotification = async (registrationData, eventData, adminEmail) => {
  try {
    if (!adminEmail) {
      console.log('⚠️  No admin email configured, skipping admin notification');
      return { success: false, reason: 'No admin email configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Yoga Studio System" <${process.env.EMAIL_USER || 'info@nextechspires.com'}>`,
      to: adminEmail,
      subject: `🔔 New Registration: ${eventData.title}`,
      html: generateAdminNotificationEmail(registrationData, eventData)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending admin notification email:', error);
    throw error;
  }
};

// Send both emails (registrant confirmation + admin notification)
const sendRegistrationEmails = async (registrationData, eventData, adminEmail) => {
  const results = {
    registrantEmail: { success: false, error: null },
    adminEmail: { success: false, error: null }
  };

  // Send confirmation to registrant
  try {
    const result = await sendRegistrationConfirmation(registrationData, eventData, adminEmail);
    results.registrantEmail = result;
  } catch (error) {
    results.registrantEmail = { success: false, error: error.message };
  }

  // Send notification to admin
  try {
    const result = await sendAdminNotification(registrationData, eventData, adminEmail);
    results.adminEmail = result;
  } catch (error) {
    results.adminEmail = { success: false, error: error.message };
  }

  return results;
};

module.exports = {
  sendRegistrationConfirmation,
  sendAdminNotification,
  sendRegistrationEmails
};
