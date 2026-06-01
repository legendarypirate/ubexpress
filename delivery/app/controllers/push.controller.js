const fs = require("fs");
const path = require("path");
const db = require("../models");
const User = db.users;
const fcmService = require("../services/fcm.service");
const inbox = require("../services/notificationInbox.service");
const { Op } = db.Sequelize;

const EXPECTED_FCM_KEY_PATH = path.join(
  __dirname,
  "../../firebase-service-account.json"
);

/** GET /api/push/status — check Firebase Admin setup (no secrets) */
exports.getStatus = (req, res) => {
  const resolved = fcmService.resolveServiceAccountFile();
  const fileExists = resolved ? fs.existsSync(resolved) : false;
  const ready = fcmService.initFirebaseAdmin();

  let projectId = null;
  let clientEmail = null;
  if (fileExists && resolved) {
    try {
      const sa = JSON.parse(fs.readFileSync(resolved, "utf8"));
      projectId = sa.project_id || null;
      clientEmail = sa.client_email || null;
    } catch (_) {
      /* ignore */
    }
  }

  res.json({
    success: true,
    firebase_admin_ready: ready,
    service_account_file_exists: fileExists,
    service_account_path: resolved || EXPECTED_FCM_KEY_PATH,
    project_id: projectId,
    expected_project_id: "express-dde3f",
    project_id_matches: projectId === "express-dde3f",
    client_email: clientEmail,
    expected_path: EXPECTED_FCM_KEY_PATH,
    env_path: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || null,
    ios_apns_checklist: [
      "Firebase → Cloud Messaging → com.ub.express → upload .p8 to Development AND Production",
      "Key ID must match your .p8 (e.g. CW3JG6DMR4 for AuthKey_CW3JG6DMR4.p8), Team ID: B657WPQ8S9",
      "Google Cloud → express-dde3f → enable Firebase Cloud Messaging API",
    ],
    hint: ready
      ? "FCM Admin OK. If iOS fails with third-party-auth-error, fix APNs in Firebase (not the service account file type)."
      : `Upload Firebase service account JSON to: ${EXPECTED_FCM_KEY_PATH} then pm2 restart`,
  });
};

/** POST /api/auth/fcm-token — save device token for logged-in user */
exports.registerToken = async (req, res) => {
  const { user_id, fcm_token, platform } = req.body;

  if (!user_id || !fcm_token) {
    return res.status(400).json({
      success: false,
      message: "user_id and fcm_token are required",
    });
  }

  try {
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await user.update({
      fcm_token,
      fcm_platform: platform || "android",
    });

    res.json({ success: true, message: "FCM token saved" });
  } catch (err) {
    console.error("[FCM] registerToken error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const ADMIN_ROLE_ID = parseInt(process.env.ADMIN_ROLE_ID || "1", 10);

/** GET /api/push/audience — device counts with FCM tokens by role */
exports.getAudienceStats = async (req, res) => {
  const role = Number(req.user?.role);
  if (role !== ADMIN_ROLE_ID) {
    return res.status(403).json({
      success: false,
      message: "Only admins can view push audience stats",
    });
  }

  try {
    const roles = [
      { role_id: 2, label: "merchant" },
      { role_id: 3, label: "driver" },
    ];

    const stats = await Promise.all(
      roles.map(async ({ role_id, label }) => {
        const withToken = await User.count({
          where: { role_id, fcm_token: { [Op.ne]: null } },
        });
        const total = await User.count({ where: { role_id } });
        return { role_id, label, with_token: withToken, total };
      })
    );

    const fcmReady = fcmService.initFirebaseAdmin();

    res.json({
      success: true,
      firebase_ready: fcmReady,
      audiences: stats,
    });
  } catch (err) {
    console.error("[FCM] getAudienceStats error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** POST /api/push/send — send push to users by ids and/or role_id (admin only) */
exports.sendPush = async (req, res) => {
  const role = Number(req.user?.role);
  if (role !== ADMIN_ROLE_ID) {
    return res.status(403).json({
      success: false,
      message: "Only admins can send push notifications",
    });
  }

  const { title, body, user_ids, role_id, data } = req.body;

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      message: "title and body are required",
    });
  }

  if ((!user_ids || user_ids.length === 0) && role_id == null) {
    return res.status(400).json({
      success: false,
      message: "Provide user_ids and/or role_id",
    });
  }

  const targetRoleId = role_id != null ? Number(role_id) : null;
  if (targetRoleId != null && targetRoleId !== 2 && targetRoleId !== 3) {
    return res.status(400).json({
      success: false,
      message: "role_id must be 2 (merchant) or 3 (driver)",
    });
  }

  try {
    const userWhere = {};
    if (user_ids?.length) {
      userWhere.id = user_ids;
    }
    if (role_id != null) {
      userWhere.role_id = role_id;
    }

    const users = await User.findAll({
      where: userWhere,
      attributes: ["id", "fcm_token", "fcm_platform", "role_id"],
    });

    const broadcastData = {
      ...(data || {}),
      type: data?.type || "admin_broadcast",
    };

    await inbox.recordForUsers(users.map((u) => u.id), {
      title,
      body,
      type: broadcastData.type,
      data: broadcastData,
    });

    const usersWithTokens = users.filter((u) => u.fcm_token);
    const tokens = usersWithTokens.map((u) => u.fcm_token).filter(Boolean);

    if (tokens.length === 0) {
      console.warn("[FCM] sendPush: no tokens for", { user_ids, role_id });
      return res.json({
        success: true,
        message: "No devices with FCM tokens found",
        sent: 0,
        users: user_ids || [],
      });
    }

    usersWithTokens.forEach((u) => {
      console.log(
        `[FCM] sendPush → user ${u.id} platform=${u.fcm_platform || "unknown"} token=${(u.fcm_token || "").slice(0, 12)}...`
      );
    });

    const result = await fcmService.sendToTokens(
      tokens,
      title,
      body,
      broadcastData
    );

    console.log(
      `[FCM] sendPush result: sent=${result.successCount} failed=${result.failureCount} targets=${tokens.length}`
    );

    if (result.invalidTokens.length > 0) {
      await User.update(
        { fcm_token: null },
        { where: { fcm_token: result.invalidTokens } }
      );
    }

    res.json({
      success: true,
      sent: result.successCount,
      failed: result.failureCount,
      targets: tokens.length,
      platforms: usersWithTokens.map((u) => ({
        id: u.id,
        platform: u.fcm_platform,
      })),
      inbox_saved: users.length,
    });
  } catch (err) {
    console.error("[FCM] sendPush error:", err);
    const isConfig = err.message?.includes("not configured");
    res.status(500).json({
      success: false,
      message: err.message,
      ...(isConfig && {
        expected_path: EXPECTED_FCM_KEY_PATH,
        file_exists: fs.existsSync(EXPECTED_FCM_KEY_PATH),
        check_status: "GET /api/push/status",
      }),
    });
  }
};
