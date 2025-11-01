const crypto = require('crypto');

// Verify webhook secret to prevent unauthorized uploads
function verifyWebhookSecret() {
  const providedSecret = process.env.PROVIDED_SECRET;
  const expectedSecret = process.env.WEBHOOK_SECRET;
  
  if (!expectedSecret) {
    console.error('❌ WEBHOOK_SECRET not configured in repository secrets');
    process.exit(1);
  }
  
  if (!providedSecret) {
    console.error('❌ No secret provided in request');
    process.exit(1);
  }
  
  // Use constant-time comparison to prevent timing attacks
  const providedBuffer = Buffer.from(providedSecret);
  const expectedBuffer = Buffer.from(expectedSecret);
  
  if (providedBuffer.length !== expectedBuffer.length) {
    console.error('❌ Invalid webhook secret');
    process.exit(1);
  }
  
  const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
  
  if (!isValid) {
    console.error('❌ Invalid webhook secret');
    process.exit(1);
  }
  
  console.log('✓ Webhook secret verified');
}

verifyWebhookSecret();

