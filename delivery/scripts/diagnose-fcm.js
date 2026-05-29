#!/usr/bin/env node
/**
 * Run on server: node scripts/diagnose-fcm.js [USER_ID]
 * Checks service account + optional test send for user's fcm_token.
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const path = require("path");
const fs = require("fs");
const fcmService = require("../app/services/fcm.service");

const EXPECTED_PROJECT = "express-dde3f";
const keyPath =
  fcmService.resolveServiceAccountFile() ||
  path.join(__dirname, "../firebase-service-account.json");

console.log("=== FCM diagnose ===\n");
console.log("Service account file:", keyPath);
console.log("Exists:", fs.existsSync(keyPath));

if (fs.existsSync(keyPath)) {
  const sa = JSON.parse(fs.readFileSync(keyPath, "utf8"));
  console.log("project_id:", sa.project_id, sa.project_id === EXPECTED_PROJECT ? "OK" : "WRONG (must be express-dde3f)");
  console.log("client_email:", sa.client_email);
}

if (!fcmService.initFirebaseAdmin()) {
  console.error("\nFirebase Admin failed to init.");
  process.exit(1);
}
console.log("\nFirebase Admin: OK");

const userId = process.argv[2];
if (!userId) {
  console.log("\nOptional: node scripts/diagnose-fcm.js 52  (sends test push to user)");
  process.exit(0);
}

(async () => {
  const db = require("../app/models");
  const user = await db.users.findByPk(userId, {
    attributes: ["id", "fcm_token", "fcm_platform"],
  });
  if (!user?.fcm_token) {
    console.error(`User ${userId} has no fcm_token`);
    process.exit(1);
  }
  console.log(`\nSending test to user ${userId} platform=${user.fcm_platform}`);
  const result = await fcmService.sendToTokens(
    [user.fcm_token],
    "FCM test",
    "Diagnose script",
    { type: "test" }
  );
  console.log("Result:", result);
  process.exit(result.successCount > 0 ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
