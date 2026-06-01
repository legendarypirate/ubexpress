const db = require("../models");
const Good = db.goods;

/** Delivered or cancelled — goods stock already settled. */
const TERMINAL_DELIVERY_STATUSES = [3, 4];

/** Cancelled or visited address — return in_delivery to warehouse stock. */
const RESTORE_STOCK_STATUSES = [4, 5];

async function restoreItemsToStock(items, delivery, transaction, historyComment) {
  for (const item of items) {
    if (!item.good_id) continue;
    const good = await Good.findByPk(item.good_id, { transaction });
    if (!good) continue;

    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    const currentStock = Number(good.stock) || 0;
    const currentInDelivery = Number(good.in_delivery) || 0;

    await good.update(
      {
        stock: currentStock + qty,
        in_delivery: Math.max(0, currentInDelivery - qty),
      },
      { transaction }
    );

    await db.good_histories.create(
      {
        good_id: item.good_id,
        type: 4,
        amount: qty,
        delivery_id: delivery.id,
        comment: historyComment,
      },
      { transaction }
    );
  }
}

async function markItemsAsDelivered(items, delivery, transaction) {
  for (const item of items) {
    if (!item.good_id) continue;
    const good = await Good.findByPk(item.good_id, { transaction });
    if (!good) continue;

    const qty = Number(item.quantity) || 0;
    if (qty <= 0) continue;

    const currentInDelivery = Number(good.in_delivery) || 0;
    const currentDelivered = Number(good.delivered) || 0;

    await good.update(
      {
        in_delivery: Math.max(0, currentInDelivery - qty),
        delivered: currentDelivered + qty,
      },
      { transaction }
    );

    await db.good_histories.create(
      {
        good_id: item.good_id,
        type: 5,
        amount: qty,
        delivery_id: delivery.id,
        comment: `Хүргэлт амжилттай (Delivery ID: ${delivery.delivery_id})`,
      },
      { transaction }
    );
  }
}

function shouldRestoreToStock(newStatus, previousStatus) {
  const newStatusInt = Number(newStatus);
  const previousStatusInt = Number(previousStatus);
  return (
    RESTORE_STOCK_STATUSES.includes(newStatusInt) &&
    !TERMINAL_DELIVERY_STATUSES.includes(previousStatusInt)
  );
}

function shouldMarkAsDelivered(newStatus, previousStatus) {
  return Number(newStatus) === 3 && Number(previousStatus) !== 3;
}

/** Only restore warehouse stock on delete when goods are still in in_delivery. */
function shouldRestoreOnDelete(deliveryStatus) {
  return ![3, 4, 5].includes(Number(deliveryStatus));
}

module.exports = {
  TERMINAL_DELIVERY_STATUSES,
  RESTORE_STOCK_STATUSES,
  restoreItemsToStock,
  markItemsAsDelivered,
  shouldRestoreToStock,
  shouldMarkAsDelivered,
  shouldRestoreOnDelete,
};
