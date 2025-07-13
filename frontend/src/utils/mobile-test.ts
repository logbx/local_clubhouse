// Mobile Reset Password Test Utility
// This file can be used to test mobile-specific functionality

export const testMobilePasswordReset = () => {
  console.log('🔍 Testing Mobile Password Reset Functionality...');
  
  // Test 1: Check if running on mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  console.log(`📱 Mobile device detected: ${isMobile}`);
  
  // Test 2: Check viewport meta tag
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const hasProperViewport = viewportMeta?.getAttribute('content')?.includes('width=device-width');
  console.log(`🖥️ Proper viewport meta: ${hasProperViewport}`);
  
  // Test 3: Check if URL parameters are properly parsed
  const urlParams = new URLSearchParams(window.location.search);
  const hasToken = urlParams.has('token');
  console.log(`🔗 URL token parameter: ${hasToken ? 'Present' : 'Missing'}`);
  
  // Test 4: Check touch support
  const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  console.log(`👆 Touch support: ${hasTouchSupport}`);
  
  // Test 5: Check if inputs have proper mobile attributes
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  const hasTouchOptimization = Array.from(passwordInputs).some(input => 
    input.classList.contains('touch-manipulation')
  );
  console.log(`🎯 Touch-optimized inputs: ${hasTouchOptimization}`);
  
  // Test results summary
  const testResults = {
    isMobile,
    hasProperViewport,
    hasToken,
    hasTouchSupport,
    hasTouchOptimization,
    allTestsPassed: hasProperViewport && hasTouchSupport
  };
  
  console.log('📊 Test Results:', testResults);
  
  if (testResults.allTestsPassed) {
    console.log('✅ Mobile password reset should work properly!');
  } else {
    console.log('⚠️ Some mobile optimizations may be missing');
  }
  
  return testResults;
};

// Test deep linking functionality
export const testDeepLinking = (testToken: string = 'test-token-123') => {
  console.log('🔗 Testing Deep Linking...');
  
  const testUrl = `${window.location.origin}/reset-password?token=${testToken}`;
  console.log(`📋 Test URL: ${testUrl}`);
  
  // Test URL construction
  const url = new URL(testUrl);
  const tokenFromUrl = url.searchParams.get('token');
  
  console.log(`🎯 Token extraction: ${tokenFromUrl === testToken ? 'Success' : 'Failed'}`);
  
  return {
    testUrl,
    tokenExtracted: tokenFromUrl === testToken,
    urlValid: url.pathname === '/reset-password'
  };
};

// Function to simulate mobile email click
export const simulateMobileEmailClick = () => {
  console.log('📧 Simulating mobile email link click...');
  
  // This would typically be called when testing the email link
  const emailLink = document.createElement('a');
  emailLink.href = `${window.location.origin}/reset-password?token=sample-token`;
  emailLink.target = '_blank';
  emailLink.rel = 'noopener noreferrer';
  
  console.log('📱 Email link created with proper mobile attributes');
  return emailLink;
};

// Export test function for console use
if (typeof window !== 'undefined') {
  (window as any).testMobilePasswordReset = testMobilePasswordReset;
  (window as any).testDeepLinking = testDeepLinking;
} 