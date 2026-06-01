module.exports = (app) => {
  const push = require("../controllers/push.controller");
  const { authenticate } = require("../middleware/auth.middleware");
  const router = require("express").Router();

  router.get("/status", push.getStatus);

  router.get("/audience", authenticate, push.getAudienceStats);
  router.post("/send", authenticate, push.sendPush);

  app.use("/api/push", router);
};
