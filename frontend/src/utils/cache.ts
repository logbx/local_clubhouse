/**
 * Cache management utilities for development
 */

export const clearBrowserCache = async (): Promise<void> => {
  try {
    // Clear service worker caches if available
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('🧹 Service worker caches cleared');
    }
    
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 Local storage cleared');
    
  } catch (error) {
    console.error('❌ Error clearing browser cache:', error);
  }
};

export const disableCacheForDevelopment = (): void => {
  if (import.meta.env.DEV) {
    // Add meta tags to prevent caching
    const metaTags = [
      { name: 'cache-control', content: 'no-cache, no-store, must-revalidate' },
      { name: 'pragma', content: 'no-cache' },
      { name: 'expires', content: '0' }
    ];
    
    metaTags.forEach(({ name, content }) => {
      const existingTag = document.querySelector(`meta[name="${name}"]`);
      if (!existingTag) {
        const meta = document.createElement('meta');
        meta.name = name;
        meta.content = content;
        document.head.appendChild(meta);
      }
    });
    
    console.log('🛡️ Development cache prevention enabled');
  }
};

// Development-only global function to clear cache from console
if (import.meta.env.DEV) {
  (window as any).clearDevCache = clearBrowserCache;
  console.log('💡 Development tip: Type clearDevCache() in console to clear browser cache');
} 