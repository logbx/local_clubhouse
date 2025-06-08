module.exports = {
  apps: [
    {
      name: 'saas-backend',
      script: './backend/dist/main.js',
      cwd: '/root/saas-app',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: '/root/saas-app/logs/backend.log',
      error_file: '/root/saas-app/logs/backend-error.log',
      out_file: '/root/saas-app/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'saas-frontend',
      script: 'serve',
      args: '-s dist -l 3001',
      cwd: '/root/saas-app/frontend',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      },
      log_file: '/root/saas-app/logs/frontend.log',
      error_file: '/root/saas-app/logs/frontend-error.log',
      out_file: '/root/saas-app/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
}; 