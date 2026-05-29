const db = require("../models");
const User = db.users;
const fcmService = require("../services/fcm.service");
const { Op } = db.Sequelize;

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

/** POST /api/push/send — send push to users by ids and/or role_id */
exports.sendPush = async (req, res) => {
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

  try {
    const where = { fcm_token: { [Op.ne]: null } };
    if (user_ids?.length) {
      where.id = user_ids;
    }
    if (role_id != null) {
      where.role_id = role_id;
    }

    const users = await User.findAll({
      where,
      attributes: ["id", "fcm_token"],
    });

    const tokens = users.map((u) => u.fcm_token).filter(Boolean);

    if (tokens.length === 0) {
      return res.json({
        success: true,
        message: "No devices with FCM tokens found",
        sent: 0,
      });
    }

    const result = await fcmService.sendToTokens(tokens, title, body, data || {});

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
    });
  } catch (err) {
    console.error("[FCM] sendPush error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
