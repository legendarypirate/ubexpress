const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

let initialized = false;

/** Delivery API root (/var/www/ubexpress/delivery) */
const DELIVERY_ROOT = path.join(__dirname, "../..");

function resolveServiceAccountFile() {
  const candidates = [];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    candidates.push(path.isAbsolute(p) ? p : path.join(DELIVERY_ROOT, p));
  }

  candidates.push(path.join(DELIVERY_ROOT, "firebase-service-account.json"));
  candidates.push(path.join(DELIVERY_ROOT, "config", "firebase-service-account.json"));

  for (const filePath of candidates) {
    if (filePath && fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

function initFirebaseAdmin() {
  if (initialized) return true;

  try {
    if (admin.apps.length > 0) {
      initialized = true;
      return true;
    }

    const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (jsonEnv) {
      const serviceAccount = JSON.parse(jsonEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log("[FCM] Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_JSON");
      return true;
    }

    const filePath = resolveServiceAccountFile();
    if (filePath) {
      const raw = fs.readFileSync(filePath, "utf8");
      const serviceAccount = JSON.parse(raw);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      console.log(`[FCM] Firebase Admin initialized from ${filePath}`);
      return true;
    }

    console.warn(
      "[FCM] Firebase Admin not configured. Place firebase-service-account.json in:",
      path.join(DELIVERY_ROOT, "firebase-service-account.json"),
      "or set FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_SERVICE_ACCOUNT_JSON"
    );
    return false;
  } catch (err) {
    console.error("[FCM] Failed to initialize Firebase Admin:", err.message);
    return false;
  }
}

/**
 * Send push notification to multiple FCM device tokens.
 * @returns {{ successCount: number, failureCount: number, invalidTokens: string[] }}
 */
async function sendToTokens(tokens, title, body, data = {}) {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];
  if (uniqueTokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  if (!initFirebaseAdmin()) {
    throw new Error("Firebase Admin is not configured on the server");
  }

  const stringData = {};
  Object.entries(data).forEach(([key, value]) => {
    stringData[key] = value == null ? "" : String(value);
  });

  const message = {
    notification: { title, body },
    data: stringData,
    android: {
      priority: "high",
      notification: {
        channelId: "bee_deliv_default",
        sound: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
    tokens: uniqueTokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  const invalidTokens = [];

  response.responses.forEach((res, index) => {
    if (!res.success) {
      console.error(
        `[FCM] Send failed for token[${index}]: ${res.error?.code} — ${res.error?.message}`
      );
      const code = res.error?.code;
      if (
        code === "messaging/invalid-registration-token" ||
        code === "messaging/registration-token-not-registered"
      ) {
        invalidTokens.push(uniqueTokens[index]);
      }
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    invalidTokens,
  };
}

module.exports = {
  initFirebaseAdmin,
  sendToTokens,
  resolveServiceAccountFile,
};
