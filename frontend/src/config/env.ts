interface EnvConfig {
  apiUrl: string;
  wsUrl: string;
  s3Bucket: string;
  s3Region: string;
  environment: 'development' | 'production';
  appName: string;
  enableAnalytics: boolean;
  enableDebugMode: boolean;
}

const getEnvConfig = (): EnvConfig => {
  // In development, use relative URLs to go through Vite proxy
  // In production, use the full API URL
  const isDev = import.meta.env.DEV;
  const apiUrl = isDev 
    ? '' // Relative URL for development (uses Vite proxy)
    : (import.meta.env.VITE_API_URL || 'http://localhost:3001');
  
  return {
    apiUrl,
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
    s3Bucket: import.meta.env.VITE_AWS_S3_BUCKET || 'localclubhouse-images',
    s3Region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
    environment: (import.meta.env.VITE_MODE as 'development' | 'production') || 'development',
    appName: import.meta.env.VITE_APP_NAME || 'Local Clubhouse',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableDebugMode: import.meta.env.VITE_ENABLE_DEBUG_MODE === 'true'
  };
};

export const envConfig = getEnvConfig();