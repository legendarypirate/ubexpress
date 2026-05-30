module.exports = app => {
    const delivery = require("../controllers/delivery.controller.js");
    const { authenticate } = require("../middleware/auth.middleware");
  
    var router = require("express").Router();

    // Mobile merchant app (Flutter): create delivery without JWT
    router.post("/", delivery.create);

    router.use(authenticate);

    router.get("/statistic", delivery.statistic);
    router.post("/status", delivery.status);
    router.post("/update-delivery-dates", delivery.updateDeliveryDates);

    router.post("/allocate", delivery.allocateDeliveries);
    router.get("/findAllWithDate", delivery.findAllWithDate);
  
    // Retrieve all Tutorials
    router.get("/", delivery.findAll);
    router.get("/product-report", delivery.findAllForProductReport);
    router.get('/delivery-status-counts', delivery.getStatusCounts);

  router.get("/:deliveryId/items", delivery.getItemsByDeliveryId);
  router.put("/:deliveryId/items/:itemId", delivery.updateDeliveryItem);
  router.delete("/:deliveryId/items/:itemId", delivery.deleteDeliveryItem);
  router.get("/:id/history", delivery.getDeliveryHistory);


  router.post("/delete-multiple", delivery.deleteMultiple);

    // Retrieve all published Tutorials
    router.get("/published", delivery.findAllPublished);
  
    // Retrieve a single Tutorial with id
    router.get("/:id", delivery.findOne);
  
    // Update a Tutorial with id
    router.put("/:id", delivery.update);

    router.post('/import', delivery.importExcelDeliveries);

    // Delete a Tutorial with id
    router.delete("/:id", delivery.delete);
  
    // Delete all Tutorials
    router.delete("/", delivery.deleteAll);
  
    app.use('/api/delivery', router);
  };
  