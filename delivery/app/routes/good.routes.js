module.exports = app => {
    const good = require("../controllers/good.controller.js");
    const { authenticate } = require("../middleware/auth.middleware");
  
    var router = require("express").Router();

    // Mobile app lists merchant goods without JWT (Flutter: GET /api/good?merchant_id=)
    router.get("/", good.findAll);

    router.use(authenticate);

    router.patch("/:id/stock", good.updateStock);
    router.get("/:id/history", good.getHistory);
    router.post("/", good.create);
  
    // Retrieve all published Tutorials
    router.get("/published", good.findAllPublished);
  
    // Retrieve a single Tutorial with id
    router.get("/:id", good.findOne);
  
    // Update a Tutorial with id
    router.patch("/:id", good.update);
  
    // Delete a Tutorial with id
    router.delete("/:id", good.delete);
  
    // Delete all Tutorials
    router.delete("/", good.deleteAll);
  

    app.use('/api/good', router);
  };
  