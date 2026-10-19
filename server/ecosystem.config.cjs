/*
 * ─────────────────────────────────────────────────────────
 * 🚨 ERP SHUT DOWN 🚨
 * The Classgrid ERP is shut down and will never work or be worked on again.
 * The org admin dashboard and every dashboard other than chat.classgrid.in and the
 * super admin dashboard are banned, and so is all ERP backend code.
 * Any issue or bug in the ERP or the org admin dashboard is banned too: do not look
 * for it, report it or fix it.
 * Do not build, fix, test or talk about ERP features. Only chat.classgrid.in and the
 * super admin dashboard are live.
 * ─────────────────────────────────────────────────────────
 */
// PM2 Ecosystem Config — Classgrid Platform
// Usage:
//   npm install -g pm2
//   pm2 start ecosystem.config.cjs                     ← development (single instance)
//   pm2 start ecosystem.config.cjs --env staging       ← staging (t3.micro, 2 instances)
//   pm2 start ecosystem.config.cjs --env production    ← production (t3.medium, max instances)
//   pm2 save          ← persists across reboots
//   pm2 startup       ← auto-start on server reboot
//   pm2 monit         ← live monitoring dashboard

module.exports = {
    apps: [
        {
            name: "classgrid",
            script: "./server.js",

            // ── Default (development): single instance, fork mode
            instances: 1,
            exec_mode: "fork",

            // ── Auto restart on crash (resilience)
            watch: false,            // don't watch files in production
            autorestart: true,       // restart crashed processes automatically
            max_restarts: 10,        // max 10 restarts before giving up
            restart_delay: 2000,     // wait 2s between restarts

            // ── Memory guard — restart if process leaks beyond threshold
            max_memory_restart: "512M",

            // ── Graceful shutdown (close open connections before killing)
            kill_timeout: 30000,      // 30s grace period
            listen_timeout: 10000,   // 10s for process to signal ready

            // ── Default Development env
            env: {
                NODE_ENV: "development",
                PORT: 3000,
            },

            // ── Staging Environment (t3.micro — 1 vCPU, 1GB RAM)
            // Use: pm2 start ecosystem.config.cjs --env staging
            env_staging: {
                NODE_ENV: "staging",
                PORT: 3000,
                // t3.micro has 1 vCPU — use 2 instances (cluster mode override)
                instances: 2,
                exec_mode: "cluster",
                max_memory_restart: "384M",  // Conservative for 1GB RAM
            },

            // ── Production Environment (t3.medium — 2 vCPU, 4GB RAM)
            // Use: pm2 start ecosystem.config.cjs --env production
            env_production: {
                NODE_ENV: "production",
                PORT: 3000,
                // t3.medium has 2 vCPU — use all cores for max throughput
                instances: "max",
                exec_mode: "cluster",
                max_memory_restart: "512M",
            },

            // ── Logging
            out_file: "./logs/pm2-out.log",
            error_file: "./logs/pm2-error.log",
            merge_logs: true,
            log_date_format: "YYYY-MM-DD HH:mm:ss",
        },
        {
            name: "classgrid-rescue",
            script: "./rescue-server.js",
            instances: 1,
            exec_mode: "fork",
            watch: false,
            autorestart: true,
            env: {
                NODE_ENV: "production",
                PORT: 4000,
            },
        },
    ],

    // ── Deploy configuration for CI/CD
    deploy: {
        staging: {
            user: "ubuntu",
            host: "staging.classgrid.in",
            ref: "origin/staging",
            repo: "git@github.com:Nikhilnick5050/classgrid_platform.git",
            path: "/home/ubuntu/classgrid",
            "pre-deploy-local": "",
            "post-deploy": "cd server && npm ci --production && pm2 reload ecosystem.config.cjs --env staging",
            "pre-setup": "",
        },
        production: {
            user: "ubuntu",
            host: "app.classgrid.in",
            ref: "origin/main",
            repo: "git@github.com:Nikhilnick5050/classgrid_platform.git",
            path: "/home/ubuntu/classgrid",
            "pre-deploy-local": "",
            "post-deploy": "cd server && npm ci --production && pm2 reload ecosystem.config.cjs --env production",
            "pre-setup": "",
        },
    },
};
