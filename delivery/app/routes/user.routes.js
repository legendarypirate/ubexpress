module.exports = app => {
    const user = require("../controllers/user.controller.js");
    const { authenticate } = require("../middleware/auth.middleware");
  
    var router = require("express").Router();

    // Flutter admin app: list users (merchants/drivers) without JWT
    router.get("/", user.findAll);
    router.get("/merchant", user.findMerchants);
    router.get("/drivers", user.findDrivers);
    router.get("/published", user.findAllPublished);

    router.use(authenticate);

    router.post("/", user.create);
    router.post("/:id/api-key", user.generateApiKey);

    // Retrieve a single Tutorial with id
    router.get("/:id", user.findOne);
  
    // Update a Tutorial with id
    router.put("/:id", user.update);
  
    // Delete a Tutorial with id
    router.delete("/:id", user.delete);
  
    // Delete all Tutorials
    router.delete("/", user.deleteAll);

    app.use('/api/user', router);
  };
  