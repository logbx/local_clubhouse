const sgMail = require('@sendgrid/mail');
require('dotenv').config({ path: '.env.production' });

// Configure SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;
const FRONTEND_URL = process.env.FRONTEND_URL;

console.log('🔧 Testing SendGrid Configuration...');
console.log('SENDGRID_API_KEY:', SENDGRID_API_KEY ? 'Set ✅' : 'Missing ❌');
console.log('FROM_EMAIL:', FROM_EMAIL || 'Missing ❌');
console.log('FRONTEND_URL:', FRONTEND_URL || 'Missing ❌');
console.log('');

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY is missing!');
  process.exit(1);
}

if (!FROM_EMAIL) {
  console.error('❌ FROM_EMAIL is missing!');
  process.exit(1);
}

// Initialize SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

async function sendTestEmail() {
  const testEmail = 'loganmay168@gmail.com';
  
  const msg = {
    to: testEmail,
    from: FROM_EMAIL,
    subject: '🧪 SendGrid Test Email - Local Clubhouse',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h1 style="margin: 0; font-size: 28px;">🎉 SendGrid Test Successful!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Local Clubhouse Email Service</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #333; margin-top: 0;">✅ Email Configuration Working</h2>
          <p style="color: #666; line-height: 1.6;">
            Congratulations! Your SendGrid integration is working correctly. This test email confirms that:
          </p>
          <ul style="color: #666; line-height: 1.8;">
            <li>✅ SendGrid API key is valid</li>
            <li>✅ Sender email is authenticated</li>
            <li>✅ Email delivery is functional</li>
            <li>✅ HTML templates are rendering properly</li>
          </ul>
        </div>

        <div style="background: #e8f5e8; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #155724; margin-top: 0;">🔧 Configuration Details</h3>
          <p style="color: #155724; margin: 5px 0;"><strong>From:</strong> ${FROM_EMAIL}</p>
          <p style="color: #155724; margin: 5px 0;"><strong>Frontend URL:</strong> ${FRONTEND_URL || 'Not set'}</p>
          <p style="color: #155724; margin: 5px 0;"><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #856404; margin-top: 0;">🚀 Next Steps</h3>
          <p style="color: #856404; line-height: 1.6;">
            Your forgot password feature is now ready to use! Users can:
          </p>
          <ol style="color: #856404; line-height: 1.8;">
            <li>Click "Forgot Password" on the login page</li>
            <li>Enter their email address</li>
            <li>Receive a secure reset link via email</li>
            <li>Reset their password safely</li>
          </ol>
        </div>

        <div style="text-align: center; padding: 20px; color: #666;">
          <p style="margin: 0;">This is an automated test email from Local Clubhouse</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">If you received this unexpectedly, please ignore it.</p>
        </div>
      </div>
    `,
    text: `
SendGrid Test Email - Local Clubhouse

✅ Email Configuration Working!

Congratulations! Your SendGrid integration is working correctly.

Configuration Details:
- From: ${FROM_EMAIL}
- Frontend URL: ${FRONTEND_URL || 'Not set'}
- Test Time: ${new Date().toLocaleString()}

Your forgot password feature is now ready to use!

This is an automated test email from Local Clubhouse.
    `.trim()
  };

  try {
    console.log('📧 Sending test email to loganmay168@gmail.com...');
    await sgMail.send(msg);
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your inbox (and spam folder) for the test email.');
    console.log('');
    console.log('🎉 SendGrid integration is working perfectly!');
    console.log('💡 You can now use the forgot password feature in production.');
  } catch (error) {
    console.error('❌ Failed to send test email:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.response) {
      console.error('Response body:', error.response.body);
    }

    // Common error troubleshooting
    console.log('\n🔍 Troubleshooting Tips:');
    
    if (error.code === 401) {
      console.log('- ❌ Invalid API key. Check your SENDGRID_API_KEY');
      console.log('- 🔑 Make sure the API key has "Mail Send" permissions');
    }
    
    if (error.code === 403) {
      console.log('- ❌ Sender not verified. Verify your FROM_EMAIL in SendGrid');
      console.log('- 📧 Go to SendGrid → Settings → Sender Authentication');
    }
    
    if (error.message.includes('domain')) {
      console.log('- ❌ Domain authentication issue');
      console.log('- 🌐 Verify your domain in SendGrid dashboard');
    }
  }
}

// Run the test
sendTestEmail(); 