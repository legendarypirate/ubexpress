const db = require("../models");
const User = db.users;
const fcmService = require("./fcm.service");
const inbox = require("./notificationInbox.service");

/**
 * Notify a driver that deliveries were allocated to them (admin web/app).
 * Does not throw — logs errors so allocation API still succeeds.
 */
async function notifyDriverDeliveryAllocated(driverId, deliveryIds) {
  if (!driverId || !Array.isArray(deliveryIds) || deliveryIds.length === 0) {
    return { sent: 0, skipped: true };
  }

  try {
    const driver = await User.findByPk(driverId, {
      attributes: ["id", "fcm_token", "username"],
    });

    const count = deliveryIds.length;
    const title = "Шинэ хүргэлт";
    const body =
      count === 1
        ? "Танд 1 хүргэлт хуваарилагдлаа"
        : `Танд ${count} хүргэлт хуваарилагдлаа`;

    const pushData = {
      type: "delivery_allocated",
      driver_id: String(driverId),
      delivery_ids: deliveryIds.map(String).join(","),
      count: String(count),
    };

    await inbox.recordForUser(driverId, {
      title,
      body,
      type: pushData.type,
      data: pushData,
    });

    if (!driver?.fcm_token) {
      return { sent: 0, skipped: true, reason: "no_token", inbox: true };
    }

    const result = await fcmService.sendToTokens(
      [driver.fcm_token],
      title,
      body,
      pushData
    );

    if (result.invalidTokens?.length > 0) {
      await driver.update({ fcm_token: null, fcm_platform: null });
    }

    console.log(
      `[FCM] Allocation push to driver ${driverId}: sent=${result.successCount}, failed=${result.failureCount}`
    );

    return {
      sent: result.successCount,
      failed: result.failureCount,
      skipped: false,
    };
  } catch (err) {
    console.error("[FCM] notifyDriverDeliveryAllocated error:", err.message);
    return { sent: 0, skipped: false, error: err.message };
  }
}

module.exports = {
  notifyDriverDeliveryAllocated,
};
