const db = require("../models");
const Delivery = db.deliveries;
const Status = db.statuses;
const DeliveryItem = db.delivery_items;
const adminPush = require("../services/adminPush.service");

const getTodayLocal = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const generateDeliveryId = async () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let deliveryId;
  let exists = true;

  while (exists) {
    deliveryId = Array.from(
      { length: 10 },
      () => characters[Math.floor(Math.random() * characters.length)]
    ).join("");
    const existing = await Delivery.findOne({
      where: { delivery_id: deliveryId },
    });
    if (!existing) exists = false;
  }

  return deliveryId;
};

/**
 * POST /api/partner/delivery
 * Create a delivery for the authenticated merchant (x-api-key).
 */
exports.createDelivery = async (req, res) => {
  const merchantId = req.merchant.id;

  if (!req.body.phone || !req.body.address) {
    return res.status(400).json({
      success: false,
      message: "phone and address are required.",
    });
  }

  const t = await db.sequelize.transaction();

  try {
    const delivery_id = await generateDeliveryId();

    const newDel = {
      delivery_id,
      merchant_id: merchantId,
      phone: req.body.phone,
      address: req.body.address,
      dist_id: req.body.dist_id,
      status: 1,
      is_paid: req.body.is_paid ?? false,
      is_rural: req.body.is_rural ?? false,
      price: req.body.price ?? 0,
      comment: req.body.comment || "",
      delivery_date: req.body.delivery_date || getTodayLocal(),
    };

    const delivery = await Delivery.create(newDel, { transaction: t });

    await db.histories.create(
      {
        merchant_id: merchantId,
        delivery_id: delivery.id,
        driver_id: null,
        status: 1,
      },
      { transaction: t }
    );

    if (req.body.items && Array.isArray(req.body.items)) {
      const stockValidationErrors = [];
      for (const item of req.body.items) {
        const quantity = item.quantity || 1;
        const good = await db.goods.findByPk(item.good_id, { transaction: t });

        if (!good) {
          stockValidationErrors.push(`Good not found (ID: ${item.good_id})`);
          continue;
        }

        if (good.merchant_id !== merchantId) {
          stockValidationErrors.push(
            `Good ${item.good_id} does not belong to this merchant.`
          );
          continue;
        }

        const currentStock = good.stock || 0;
        if (currentStock < quantity) {
          stockValidationErrors.push(
            `"${good.name}" - insufficient stock (available: ${currentStock}, requested: ${quantity})`
          );
        }
      }

      if (stockValidationErrors.length > 0) {
        await t.rollback();
        return res.status(400).json({
          success: false,
          message: "Insufficient stock",
          errors: stockValidationErrors,
        });
      }

      const itemsToInsert = req.body.items.map((item) => ({
        delivery_id: delivery.id,
        good_id: item.good_id,
        quantity: item.quantity || 1,
      }));

      await DeliveryItem.bulkCreate(itemsToInsert, { transaction: t });

      for (const item of req.body.items) {
        const quantity = item.quantity || 1;
        const good = await db.goods.findByPk(item.good_id, { transaction: t });
        if (!good) continue;

        await good.update(
          {
            stock: good.stock - quantity,
            in_delivery: (good.in_delivery || 0) + quantity,
          },
          { transaction: t }
        );

        await db.good_histories.create(
          {
            good_id: item.good_id,
            type: 3,
            amount: quantity,
            delivery_id: delivery.id,
            comment: `Delivery created (Delivery ID: ${delivery.delivery_id})`,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    try {
      await adminPush.notifyAdminsNewDelivery(delivery, merchantId);
    } catch (pushErr) {
      console.error("[FCM] admin new-delivery push failed:", pushErr.message);
    }

    return res.status(201).json({
      success: true,
      data: {
        id: delivery.id,
        delivery_id: delivery.delivery_id,
        merchant_id: delivery.merchant_id,
        phone: delivery.phone,
        address: delivery.address,
        status: delivery.status,
        price: delivery.price,
        comment: delivery.comment,
        delivery_date: delivery.delivery_date,
        createdAt: delivery.createdAt,
      },
    });
  } catch (err) {
    await t.rollback();
    console.error("[partner] create delivery failed:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create delivery.",
    });
  }
};

/**
 * GET /api/partner/delivery/:deliveryId
 * Check delivery status by the public delivery_id string.
 */
exports.getDeliveryStatus = async (req, res) => {
  const merchantId = req.merchant.id;
  const { deliveryId } = req.params;

  if (!deliveryId) {
    return res.status(400).json({
      success: false,
      message: "deliveryId is required.",
    });
  }

  try {
    const delivery = await Delivery.findOne({
      where: { delivery_id: deliveryId, merchant_id: merchantId },
      include: [
        {
          model: Status,
          as: "status_name",
          attributes: ["id", "status"],
        },
      ],
      attributes: [
        "id",
        "delivery_id",
        "merchant_id",
        "phone",
        "address",
        "status",
        "price",
        "comment",
        "is_paid",
        "is_rural",
        "driver_id",
        "delivery_date",
        "delivered_at",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found.",
      });
    }

    return res.json({
      success: true,
      data: {
        id: delivery.id,
        delivery_id: delivery.delivery_id,
        status: delivery.status,
        status_name: delivery.status_name?.status || null,
        phone: delivery.phone,
        address: delivery.address,
        price: delivery.price,
        comment: delivery.comment,
        is_paid: delivery.is_paid,
        is_rural: delivery.is_rural,
        driver_id: delivery.driver_id,
        delivery_date: delivery.delivery_date,
        delivered_at: delivery.delivered_at,
        createdAt: delivery.createdAt,
        updatedAt: delivery.updatedAt,
      },
    });
  } catch (err) {
    console.error("[partner] get delivery status failed:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch delivery status.",
    });
  }
};
