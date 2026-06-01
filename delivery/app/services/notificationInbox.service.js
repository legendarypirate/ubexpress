const db = require("../models");
const UserNotification = db.user_notifications;

/**
 * Save an in-app notification for one user (inbox). Does not throw.
 */
async function recordForUser(userId, { title, body, type = "general", data = {} }) {
  if (!userId || !title || !body) {
    return null;
  }

  try {
    const payload =
      typeof data === "string" ? data : JSON.stringify(data || {});

    return await UserNotification.create({
      user_id: userId,
      title: String(title).slice(0, 255),
      body: String(body),
      type: type || "general",
      data: payload,
    });
  } catch (err) {
    console.error("[Inbox] recordForUser error:", err.message);
    return null;
  }
}

/**
 * Save the same notification for many users (e.g. admin broadcast).
 */
async function recordForUsers(userIds, payload) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return 0;
  }

  const uniqueIds = [...new Set(userIds.map((id) => Number(id)).filter(Boolean))];
  let created = 0;

  for (const userId of uniqueIds) {
    const row = await recordForUser(userId, payload);
    if (row) created += 1;
  }

  return created;
}

module.exports = {
  recordForUser,
  recordForUsers,
};
