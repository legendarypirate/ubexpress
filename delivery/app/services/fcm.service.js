const admin = require("firebase-admin");
const path = require("path");

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return true;

  try {
    if (admin.apps.length > 0) {
      initialized = true;
      return true;
    }

    const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (jsonEnv) {
      const serviceAccount = JSON.parse(jsonEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      return true;
    }

    if (filePath) {
      const resolved = path.isAbsolute(filePath)
        ? filePath
        : path.join(__dirname, "../../", filePath);
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const serviceAccount = require(resolved);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      initialized = true;
      return true;
    }

    console.warn(
      "[FCM] Firebase Admin not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON."
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
};
