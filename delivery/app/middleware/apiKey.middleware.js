const db = require("../models");
const User = db.users;

/**
 * Authenticate partner requests via x-api-key header.
 * Resolves the merchant (role_id = 2) and attaches it to req.merchant.
 */
const authenticateApiKey = async (req, res, next) => {
  const apiKey =
    req.headers["x-api-key"] ||
    req.headers["x-api_key"] ||
    req.query.api_key;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "Missing API key. Send it in the x-api-key header.",
    });
  }

  try {
    const merchant = await User.findOne({
      where: { api_key: apiKey, role_id: 2 },
      attributes: { exclude: ["password", "fcm_token", "fcm_platform"] },
    });

    if (!merchant) {
      return res.status(401).json({
        success: false,
        message: "Invalid API key.",
      });
    }

    req.merchant = merchant;
    next();
  } catch (err) {
    console.error("[partner] API key auth failed:", err.message);
    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

module.exports = { authenticateApiKey };
