module.exports = (app) => {
  const controller = require("../controllers/mobileNotification.controller");
  const { authenticate } = require("../middleware/auth.middleware");
  const router = require("express").Router();

  router.get("/", authenticate, controller.listMine);
  router.get("/unread-count", authenticate, controller.unreadCount);
  router.patch("/read-all", authenticate, controller.markAllRead);

  app.use("/api/mobile/notifications", router);
};
