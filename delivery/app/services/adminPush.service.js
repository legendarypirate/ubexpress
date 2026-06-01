const db = require("../models");
const User = db.users;
const Op = db.Sequelize.Op;
const fcmService = require("./fcm.service");

/** Admin users (backoffice / admin Flutter app). */
const ADMIN_ROLE_ID = parseInt(process.env.ADMIN_ROLE_ID || "1", 10);

async function getAdminsWithTokens() {
  return User.findAll({
    where: {
      role_id: ADMIN_ROLE_ID,
      fcm_token: { [Op.ne]: null },
    },
    attributes: ["id", "fcm_token", "fcm_platform", "username"],
  });
}

/**
 * Send push to all admins with registered FCM tokens.
 * Does not throw — logs errors so API handlers still succeed.
 */
async function notifyAdmins(title, body, data = {}) {
  try {
    const admins = await getAdminsWithTokens();
    if (!admins.length) {
      console.warn("[FCM] No admin devices with FCM tokens — push skipped");
      return { sent: 0, skipped: true, reason: "no_tokens" };
    }

    const tokens = admins.map((a) => a.fcm_token).filter(Boolean);
    const result = await fcmService.sendToTokens(tokens, title, body, data);

    if (result.invalidTokens?.length > 0) {
      await User.update(
        { fcm_token: null, fcm_platform: null },
        { where: { fcm_token: result.invalidTokens } }
      );
    }

    console.log(
      `[FCM] Admin push "${title}": sent=${result.successCount}, failed=${result.failureCount}, targets=${tokens.length}`
    );

    return {
      sent: result.successCount,
      failed: result.failureCount,
      targets: tokens.length,
      skipped: false,
    };
  } catch (err) {
    console.error("[FCM] notifyAdmins error:", err.message);
    return { sent: 0, skipped: false, error: err.message };
  }
}

async function resolveMerchantName(merchantId) {
  if (!merchantId) return "Харилцагч";
  const merchant = await User.findByPk(merchantId, {
    attributes: ["username"],
  });
  return merchant?.username || "Харилцагч";
}

/** Merchant created a new delivery. */
async function notifyAdminsNewDelivery(delivery, merchantId) {
  const merchantName = await resolveMerchantName(merchantId);
  const code = delivery.delivery_id || String(delivery.id);
  const address = (delivery.address || "").trim();
  const body = address
    ? `${merchantName}: ${code} — ${address}`
    : `${merchantName}: шинэ хүргэлт ${code}`;

  return notifyAdmins("Шинэ хүргэлт", body.slice(0, 250), {
    type: "merchant_delivery_created",
    delivery_id: String(delivery.id),
    delivery_code: code,
    merchant_id: String(merchantId || ""),
  });
}

/** Merchant submitted type-1 stock request (new item / бараа үүсгэх хүсэлт). */
async function notifyAdminsItemCreateRequest(request, merchantId) {
  if (Number(request.type) !== 1) {
    return { skipped: true, reason: "not_item_create" };
  }

  const merchantName = await resolveMerchantName(merchantId);
  const name = (request.name || "Бараа").trim();
  const qty = request.stock ?? request.amount ?? "";
  const body = `${merchantName}: "${name}"${qty !== "" ? ` — ${qty} ш` : ""}`;

  return notifyAdmins("Шинэ барааны хүсэлт", body.slice(0, 250), {
    type: "item_create_request",
    request_id: String(request.id),
    merchant_id: String(merchantId || ""),
  });
}

module.exports = {
  notifyAdmins,
  notifyAdminsNewDelivery,
  notifyAdminsItemCreateRequest,
};
