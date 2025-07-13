module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'npm run build:web && npx serve dist/web -p 3000',
      startServerReadyPattern: 'Local:',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:3000',
        'http://localhost:3000/clubs',
        'http://localhost:3000/events',
        'http://localhost:3000/tournaments',
      ],
      settings: {
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['warn', { minScore: 0.8 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'interactive': ['error', { maxNumericValue: 3000 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        
        // Performance budgets
        'total-byte-weight': ['warn', { maxNumericValue: 1024000 }], // 1MB
        'uses-optimized-images': 'error',
        'uses-webp-images': 'warn',
        'uses-responsive-images': 'error',
        'efficient-animated-content': 'warn',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'warn',
        
        // Accessibility
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        
        // Best Practices
        'is-on-https': 'error',
        'uses-http2': 'warn',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn',
        
        // SEO
        'document-title': 'error',
        'meta-description': 'error',
        'crawlable-anchors': 'error',
        'robots-txt': 'warn',
        'hreflang': 'warn',
        
        // PWA
        'service-worker': 'warn',
        'installable-manifest': 'warn',
        'splash-screen': 'warn',
        'themed-omnibox': 'warn',
        'viewport': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};