const db = require("../models");
const UserNotification = db.user_notifications;
const { Op } = db.Sequelize;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function parseDataField(raw) {
  if (!raw) return {};
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function formatRow(row) {
  const plain = row.toJSON ? row.toJSON() : row;
  return {
    id: plain.id,
    title: plain.title,
    body: plain.body,
    type: plain.type,
    data: parseDataField(plain.data),
    read_at: plain.read_at,
    created_at: plain.createdAt,
  };
}

/** GET /api/mobile/notifications?page=1&limit=10 */
exports.listMine = async (req, res) => {
  const userId = Number(req.user?.id);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;

  try {
    const { count, rows } = await UserNotification.findAndCountAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    const totalPages = Math.ceil(count / limit) || 1;

    res.json({
      success: true,
      data: rows.map(formatRow),
      pagination: {
        page,
        limit,
        total: count,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    });
  } catch (err) {
    console.error("[Inbox] listMine error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/mobile/notifications/unread-count */
exports.unreadCount = async (req, res) => {
  const userId = Number(req.user?.id);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const count = await UserNotification.count({
      where: {
        user_id: userId,
        read_at: { [Op.is]: null },
      },
    });

    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/mobile/notifications/read-all */
exports.markAllRead = async (req, res) => {
  const userId = Number(req.user?.id);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const [updated] = await UserNotification.update(
      { read_at: new Date() },
      {
        where: {
          user_id: userId,
          read_at: { [Op.is]: null },
        },
      }
    );

    res.json({ success: true, updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
