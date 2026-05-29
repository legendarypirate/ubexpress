const db = require("../models");
const Good = db.goods;
const User = db.users;
const Ware = db.wares;

/**
 * GET /api/mobile/good/merchant?user_id=123
 * GET /api/mobile/good/merchant?merchant_id=123
 * Public mobile route — lists goods for create-delivery item picker (no JWT).
 */
exports.findMerchantGood = async (req, res) => {
  const rawId = req.query.user_id ?? req.query.merchant_id;

  if (rawId == null || rawId === "") {
    return res.status(400).json({
      success: false,
      message: "user_id or merchant_id is required",
    });
  }

  const merchantId = parseInt(rawId, 10);
  if (Number.isNaN(merchantId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user_id or merchant_id",
    });
  }

  try {
    const data = await Good.findAll({
      where: { merchant_id: merchantId },
      include: [
        {
          model: User,
          as: "merchant",
          attributes: ["id", "username"],
        },
        {
          model: Ware,
          as: "ware",
          attributes: ["id", "name"],
        },
      ],
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (err) {
    console.error("[mobile/good/merchant] error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load goods",
    });
  }
};

// Legacy mobile routes (kept for router compatibility)
const Order = db.orders;

exports.findDriverDeliveriesWithStatus = (req, res) => {
  const driverId = req.params.id;

  Order.findAll({
    where: {
      driver_id: driverId,
      status: 2,
    },
    include: [
      {
        model: User,
        as: "merchant",
        attributes: ["username"],
      },
    ],
  })
    .then((data) => {
      const result = data.map((order) => ({
        ...order.toJSON(),
        status_text: "Жолоочид хуваарилсан",
      }));

      res.send({
        success: true,
        data: result,
      });
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || "Some error occurred while retrieving deliveries.",
      });
    });
};

exports.findUserDeliveries = (req, res) => {
  const userId = req.query.user_id;
  Order.findAll({ where: { driver_id: userId } })
    .then((data) => res.send(data))
    .catch((err) => res.status(500).send({ message: err.message }));
};

exports.completeDelivery = (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).send({
      success: false,
      message: "Status is required.",
    });
  }

  Order.update({ status }, { where: { id } })
    .then((num) => {
      if (num == 1) {
        res.send({
          success: true,
          data: { message: "Delivery status updated to " + status },
        });
      } else {
        res.status(404).send({
          success: false,
          message: "Delivery not found.",
        });
      }
    })
    .catch((err) => {
      res.status(500).send({
        success: false,
        message: err.message,
      });
    });
};
