/**
 * Generate API key for an existing merchant.
 * Usage: node scripts/set-merchant-api-key.js [merchantId]
 * Default merchant id: 72 (japanstore)
 */
require("dotenv").config();

const crypto = require("crypto");
const db = require("../app/models");

const MERCHANT_ID = parseInt(process.argv[2] || "72", 10);

(async () => {
  try {
    await db.sequelize.authenticate();
    await db.sequelize.sync();

    const user = await db.users.findByPk(MERCHANT_ID);
    if (!user) {
      console.error(`Merchant id ${MERCHANT_ID} not found.`);
      process.exit(1);
    }

    if (user.role_id !== 2) {
      console.error(`User id ${MERCHANT_ID} is not a merchant (role_id must be 2).`);
      process.exit(1);
    }

    if (!user.api_key) {
      await user.update({ api_key: crypto.randomBytes(32).toString("hex") });
      await user.reload();
      console.log("Generated new API key.");
    } else {
      console.log("Merchant already has an API key (use ?regenerate=true via API to replace).");
    }

    console.log("\n--- Japan Store / Partner API ---");
    console.log("Merchant ID:", user.id);
    console.log("Username:", user.username);
    console.log("x-api-key:", user.api_key);
    console.log("\nEndpoints (https://api.beedeliv.mn):");
    console.log("  POST /api/partner/delivery");
    console.log("  GET  /api/partner/delivery/:deliveryId");

    process.exit(0);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  }
})();
