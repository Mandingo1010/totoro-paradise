module.exports = {
    apps: [{
        name: 'totoro-paradise',
        script: '.output/server/index.mjs',
        instances: 'max',
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000,
            FREERUN_API_TIMEOUT: 30000,
            FREERUN_MAX_RETRIES: 3,
            FREERUN_RETRY_DELAY: 1000
        }
    }]
};
