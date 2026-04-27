const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.ALERT_EMAIL,
    pass: process.env.ALERT_EMAIL_PASSWORD,
  },
});

const sendAlertEmail = async ({ type, ip, endpoint, reason, geoLabel, anomalyScore, anomalyLevel }) => {
  try {
    await transporter.sendMail({
      from: `"SentinelAI Alert" <${process.env.ALERT_EMAIL}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 SentinelAI Alert: ${type} Detected`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #f9f9f9;">
          <h2 style="color: #e53e3e;">🚨 Security Alert: ${type}</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; font-weight: bold;">Threat Type</td>
              <td style="padding: 8px;">${type}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px; font-weight: bold;">IP Address</td>
              <td style="padding: 8px;">${ip}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Location</td>
              <td style="padding: 8px;">${geoLabel}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px; font-weight: bold;">Endpoint</td>
              <td style="padding: 8px;">${endpoint}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Reason</td>
              <td style="padding: 8px;">${reason}</td>
            </tr>
            <tr style="background: #fff;">
              <td style="padding: 8px; font-weight: bold;">Anomaly Score</td>
              <td style="padding: 8px; color: #e53e3e; font-weight: bold;">${anomalyScore}/100 (${anomalyLevel})</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Time</td>
              <td style="padding: 8px;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
          <p style="color: #718096; margin-top: 20px;">SentinelAI Security System</p>
        </div>
      `,
    });
    console.log(`Alert email sent: ${type}`);
  } catch (err) {
    console.error("Email alert failed:", err.message);
  }
};

module.exports = sendAlertEmail;