/**
 * Create or update the japanstore merchant with an API key.
 * Run from delivery folder: node scripts/create-japanstore-merchant.js
 */
require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../app/models");

const MERCHANT_ID = 72;
const MERCHANT = {
  username: "japanstore",
  password: "user12",
  role_id: 2,
};

(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    let user =
      (await db.users.findByPk(MERCHANT_ID)) ||
      (await db.users.findOne({ where: { username: MERCHANT.username } }));

    if (user) {
      const updates = { role_id: MERCHANT.role_id };
      if (!user.api_key) {
        updates.api_key = crypto.randomBytes(32).toString("hex");
      }
      await user.update(updates);
      console.log("Updated existing merchant:", MERCHANT.username);
    } else {
      const hashedPassword = await bcrypt.hash(MERCHANT.password, 10);
      user = await db.users.create({
        username: MERCHANT.username,
        password: hashedPassword,
        role_id: MERCHANT.role_id,
        api_key: crypto.randomBytes(32).toString("hex"),
      });
      console.log("Created merchant:", MERCHANT.username);
    }

    console.log("\n--- Merchant credentials for backoffice login ---");
    console.log("Username:", MERCHANT.username);
    console.log("Password:", MERCHANT.password);
    console.log("Merchant ID:", user.id);
    console.log("\n--- Partner API (give this to the external company) ---");
    console.log("x-api-key:", user.api_key);
    console.log("\nEndpoints (base: https://api.beedeliv.mn):");
    console.log("  POST /api/partner/delivery");
    console.log("  GET  /api/partner/delivery/:deliveryId");

    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();
