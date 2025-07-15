import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-200">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Logo size="sm" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Local Clubhouse</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="prose dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>
          <p className="text-gray-600 dark:text-gray-400">Effective Date: July 15, 2025</p>
          <p className="text-gray-600 dark:text-gray-400">Last Updated: July 15, 2025</p>

          <h2>1. Introduction</h2>
          <p>Welcome to Local Clubhouse ("we," "our," or "us"). We operate a marketplace platform that connects local communities and event organizers with business sponsors. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.</p>
          <p>Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.</p>

          <h2>2. Information We Collect</h2>
          <h3>2.1 Information You Provide to Us</h3>
          <h4>Account Information</h4>
          <ul>
            <li>Name and contact information (email address, phone number)</li>
            <li>Username and password</li>
            <li>Profile information (optional)</li>
            <li>Company/organization details</li>
            <li>Billing and payment information</li>
            <li>Location information</li>
            <li>Event preferences and interests</li>
          </ul>

          <h4>Service Usage Data</h4>
          <ul>
            <li>Content you create, upload, or share</li>
            <li>Communications with other users through our messaging system</li>
            <li>Event participation history</li>
            <li>Community engagement metrics</li>
            <li>Sponsorship arrangements</li>
            <li>Feedback and correspondence</li>
          </ul>

          <h3>2.2 Information Automatically Collected</h3>
          <h4>Technical Data</h4>
          <ul>
            <li>IP address and device information</li>
            <li>Browser type and version</li>
            <li>Time zone setting and location</li>
            <li>Operating system and platform</li>
            <li>Usage data and analytics</li>
          </ul>

          <h4>Cookies and Tracking Technologies</h4>
          <ul>
            <li>Session cookies (essential for service operation)</li>
            <li>Analytics cookies (to improve our service)</li>
            <li>Marketing cookies (with your consent)</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use your personal information for the following purposes:</p>
          
          <h3>3.1 Service Delivery</h3>
          <ul>
            <li>Provide, operate, and maintain our service</li>
            <li>Process transactions and send related information</li>
            <li>Manage your account and provide customer support</li>
            <li>Send administrative information and updates</li>
          </ul>

          <h3>3.2 Service Improvement</h3>
          <ul>
            <li>Understand and analyze usage trends</li>
            <li>Develop new features and functionality</li>
            <li>Monitor and prevent fraud and abuse</li>
            <li>Debug and improve service performance</li>
          </ul>

          <h3>3.3 Communications</h3>
          <ul>
            <li>Respond to your comments and questions</li>
            <li>Send you marketing communications (with consent)</li>
            <li>Provide news and information we think will interest you</li>
          </ul>

          <h2>4. Data Sharing and Disclosure</h2>
          <p>We may share your information in the following situations:</p>

          <h3>4.1 Service Providers</h3>
          <p>We may share your data with third-party vendors who perform services on our behalf, such as:</p>
          <ul>
            <li>Payment processing</li>
            <li>Data analysis</li>
            <li>Email delivery</li>
            <li>Hosting services</li>
            <li>Customer service</li>
          </ul>

          <h3>4.2 Legal Requirements</h3>
          <p>We may disclose your information where required to do so by law or in response to valid requests by public authorities.</p>

          <h3>4.3 Business Transfers</h3>
          <p>In the event of a merger, acquisition, or asset sale, your personal information may be transferred.</p>

          <h3>4.4 With Your Consent</h3>
          <p>We may disclose your personal information for any other purpose with your consent.</p>

          <h2>5. Data Security</h2>
          <p>We implement appropriate technical and organizational security measures to protect your personal information, including:</p>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security assessments</li>
            <li>Access controls and authentication</li>
            <li>Employee training on data protection</li>
          </ul>
          <p>However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure.</p>

          <h2>6. Your Privacy Rights</h2>
          <p>Depending on your location, you may have the following rights:</p>

          <h3>6.1 GDPR Rights (European Users)</h3>
          <ul>
            <li>Right to access your personal data</li>
            <li>Right to rectification</li>
            <li>Right to erasure ("right to be forgotten")</li>
            <li>Right to restriction of processing</li>
            <li>Right to data portability</li>
            <li>Right to object</li>
            <li>Rights related to automated decision-making</li>
          </ul>

          <h3>6.2 CCPA Rights (California Users)</h3>
          <ul>
            <li>Right to know what personal information is collected</li>
            <li>Right to know if personal information is sold or disclosed</li>
            <li>Right to opt-out of the sale of personal information</li>
            <li>Right to delete personal information</li>
            <li>Right to non-discrimination</li>
          </ul>

          <h3>6.3 Exercising Your Rights</h3>
          <p>To exercise any of these rights, please contact us at logan@localclubhouse.com. We will respond to your request within 30 days.</p>

          <h2>7. International Data Transfers</h2>
          <p>Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with this privacy policy.</p>

          <h2>8. Data Retention</h2>
          <p>We retain your personal information for as long as necessary to fulfill the purposes outlined in this privacy policy, unless a longer retention period is required by law. When we no longer need your information, we will securely delete or anonymize it.</p>

          <h2>9. Children's Privacy</h2>
          <p>Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.</p>

          <h2>10. Third-Party Links</h2>
          <p>Our service may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.</p>

          <h2>11. Updates to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify you of any changes by:</p>
          <ul>
            <li>Posting the new privacy policy on this page</li>
            <li>Updating the "Last Updated" date</li>
            <li>Sending you an email notification (for significant changes)</li>
          </ul>

          <h2>12. Contact Us</h2>
          <p>If you have questions or concerns about this privacy policy or our practices, please contact us:</p>
          <p>
            Local Clubhouse<br />
            Email: logan@localclubhouse.com<br />
            Address: 3509 Durango Root CT, Fort Worth, Texas, 76244, USA<br />
            Phone: 806-283-3012
          </p>

          <h2>13. Legal Basis for Processing (GDPR)</h2>
          <p>For European users, our legal bases for collecting and using your personal information include:</p>
          <ul>
            <li>Consent: You have given clear consent</li>
            <li>Contract: Processing is necessary for a contract</li>
            <li>Legal obligations: Processing is necessary for compliance with the law</li>
            <li>Legitimate interests: Processing is necessary for our legitimate interests</li>
          </ul>

          <h2>14. Do Not Track</h2>
          <p>Our service does not respond to Do Not Track signals. However, you can set your browser to refuse all or some browser cookies.</p>

          <h2>15. State-Specific Rights</h2>
          <p>Residents of certain states may have additional privacy rights. Please contact us for more information about rights specific to your state.</p>
        </div>
      </main>

      {/* Back to top button */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-primary-600 dark:bg-primary-500 text-white p-3 rounded-full shadow-lg hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage; 