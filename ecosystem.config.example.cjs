/**
 * PM2 example — copy to server as ecosystem.config.cjs and adjust paths/ports.
 *
 *   cp ecosystem.config.example.cjs /var/www/ubexpress/ecosystem.config.cjs
 *   pm2 delete all   # only if you want a clean slate
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *
 * Ports (do not use the same PORT for both apps):
 *   - delivery API: 3001 or 3101 (match Flutter / NEXT_PUBLIC_API_URL)
 *   - Next.js admin: 3000 (default) or 3002
 */
module.exports = {
  apps: [
    {
      name: "ubexpress-api",
      cwd: "/var/www/ubexpress/delivery",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3101,
        // FCM: path to Firebase service account JSON (same project as Flutter: express-dde3f)
        FIREBASE_SERVICE_ACCOUNT_PATH: "/var/www/ubexpress/delivery/firebase-service-account.json",
      },
    },
    {
      name: "ubexpress-web",
      cwd: "/var/www/ubexpress/newbackoffice",
      script: "npm",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        NEXT_PUBLIC_API_URL: "http://127.0.0.1:3101",
        API_URL: "http://127.0.0.1:3101",
      },
    },
  ],
};
