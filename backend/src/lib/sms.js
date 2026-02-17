/**
 * Mock SMS service for QuickReach
 * Simulates Africa's Talking SMS API integration
 */

const sendSMS = async (to, message) => {
  // In production, this would use the Africa's Talking SDK
  // const africastalking = require('africastalking')({ ... });
  // await africastalking.SMS.send({ to, message });

  console.log(`
  📱 [SMS OUTGOING]
  To: ${to}
  Msg: "${message}"
  Timestamp: ${new Date().toLocaleTimeString()}
  ------------------
  `);
  
  return { success: true, messageId: `msg_${Math.random().toString(36).substr(2, 9)}` };
};

module.exports = { sendSMS };
