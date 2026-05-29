module.exports = (app) => {
  const push = require("../controllers/push.controller");
  const router = require("express").Router();

  router.post("/send", push.sendPush);

  app.use("/api/push", router);
};
