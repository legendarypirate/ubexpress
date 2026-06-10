module.exports = (app) => {
  const partner = require("../controllers/partner.controller.js");
  const { authenticateApiKey } = require("../middleware/apiKey.middleware");

  const router = require("express").Router();

  router.use(authenticateApiKey);

  router.post("/delivery", partner.createDelivery);
  router.get("/delivery/:deliveryId", partner.getDeliveryStatus);

  app.use("/api/partner", router);
};
