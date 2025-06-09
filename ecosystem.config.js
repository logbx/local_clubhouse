module.exports = {
  apps: [
    {
      name: 'saas-backend',
      script: './backend/dist/main.js',
      cwd: '/root/saas-app',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      max_restarts: 5,
      min_uptime: '30s',
      restart_delay: 5000,
      watch: false,
      log_file: '/root/saas-app/logs/backend.log',
      error_file: '/root/saas-app/logs/backend-error.log',
      out_file: '/root/saas-app/logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      health_check_grace_period: 3000,
      env: {
        NODE_ENV: 'development',
        PM2_SERVE_PATH: '.',
        PM2_SERVE_PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        PM2_SERVE_PATH: '.',
        PM2_SERVE_PORT: 3000
      }
    },
    {
      name: 'saas-frontend',
      script: 'serve',
      args: '-s dist -p 3002 --single',
      cwd: '/root/saas-app/frontend',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '200M',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 2000,
      watch: false,
      log_file: '/root/saas-app/logs/frontend.log',
      error_file: '/root/saas-app/logs/frontend-error.log',
      out_file: '/root/saas-app/logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
}; 