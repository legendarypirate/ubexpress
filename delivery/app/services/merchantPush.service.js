const db = require("../models");
const User = db.users;
const fcmService = require("./fcm.service");
const inbox = require("./notificationInbox.service");

/** Status IDs that notify the merchant after driver completes delivery. */
const MERCHANT_NOTIFY_STATUSES = new Set([3, 4]);

const STATUS_LABELS = {
  3: "Хүргэгдсэн",
  4: "Цуцлагдсан",
};

/**
 * Notify merchant (role 2) when driver marks delivery delivered or declined.
 * Does not throw — logs errors so completeDelivery API still succeeds.
 */
async function notifyMerchantDeliveryStatusUpdated(delivery, statusInt) {
  const status = Number(statusInt);
  if (!MERCHANT_NOTIFY_STATUSES.has(status)) {
    return { sent: 0, skipped: true, reason: "status_not_notifiable" };
  }

  const merchantId = delivery.merchant_id;
  if (!merchantId) {
    return { sent: 0, skipped: true, reason: "no_merchant" };
  }

  try {
    const merchant = await User.findByPk(merchantId, {
      attributes: ["id", "fcm_token", "fcm_platform", "username"],
    });

    const code = delivery.delivery_id || String(delivery.id);
    const statusLabel = STATUS_LABELS[status] || `Төлөв ${status}`;
    const address = (delivery.address || "").trim();

    let driverName = "";
    if (delivery.driver_id) {
      const driver = await User.findByPk(delivery.driver_id, {
        attributes: ["username"],
      });
      driverName = driver?.username || "";
    }

    const title =
      status === 3 ? "Хүргэлт хүргэгдлээ" : "Хүргэлт цуцлагдлаа";

    let body = `${code}: ${statusLabel}`;
    if (driverName) {
      body = `${driverName} — ${body}`;
    }
    if (address) {
      body = `${body} (${address})`.slice(0, 250);
    } else {
      body = body.slice(0, 250);
    }

    const pushData = {
      type: "delivery_status_updated",
      delivery_id: String(delivery.id),
      delivery_code: code,
      merchant_id: String(merchantId),
      status_id: String(status),
      status_label: statusLabel,
    };

    await inbox.recordForUser(merchantId, {
      title,
      body,
      type: pushData.type,
      data: pushData,
    });

    if (!merchant?.fcm_token) {
      console.warn(
        `[FCM] Merchant ${merchantId} has no FCM token — push skipped (inbox saved)`
      );
      return { sent: 0, skipped: true, reason: "no_token", inbox: true };
    }

    const result = await fcmService.sendToTokens(
      [merchant.fcm_token],
      title,
      body,
      pushData
    );

    if (result.invalidTokens?.length > 0) {
      await merchant.update({ fcm_token: null, fcm_platform: null });
    }

    console.log(
      `[FCM] Merchant ${merchantId} delivery ${code} status=${status}: sent=${result.successCount}, failed=${result.failureCount}`
    );

    return {
      sent: result.successCount,
      failed: result.failureCount,
      skipped: false,
    };
  } catch (err) {
    console.error("[FCM] notifyMerchantDeliveryStatusUpdated error:", err.message);
    return { sent: 0, skipped: false, error: err.message };
  }
}

module.exports = {
  notifyMerchantDeliveryStatusUpdated,
};
