// ecosystem.config.js
module.exports = {
  apps: [{
    name:      'tastehaven',
    script:    'server.js',
    instances: 'max',        // uses all CPU cores
    exec_mode: 'cluster',    // cluster mode = multiple processes
    watch:     false,        // don't restart on file changes (use for production)
    max_memory_restart: '500M',

    env: {
      NODE_ENV: 'development',
      PORT:     3000,
    },
    env_production: {
      NODE_ENV: 'production',
      PORT:     3000,
    },

    // Logs
    error_file: './logs/err.log',
    out_file:   './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',

    // Auto-restart if crash
    autorestart:   true,
    restart_delay: 1000,
    max_restarts:  10,
  }],
};