// models/orderStore.js
//
// PLACEHOLDER data-access layer, so bkashRoutes.js is runnable/readable
// standalone. Replace every method below with real calls to your actual
// database (Mongoose model, Prisma client, SQL query, etc). Keep the same
// method names/shapes so bkashRoutes.js doesn't need to change.

const orders = new Map(); // orderId -> order object, in-memory ONLY for demo

async function findById(orderId) {
  return orders.get(orderId) || null;
}

async function update(orderId, patch) {
  const existing = orders.get(orderId) || { id: orderId };
  const updated = { ...existing, ...patch };
  orders.set(orderId, updated);
  return updated;
}

async function updateByPaymentId(paymentID, patch) {
  for (const [id, order] of orders.entries()) {
    if (order.bkashPaymentID === paymentID) {
      return update(id, patch);
    }
  }
  return null;
}

// Convenience seeder for local testing:
async function _seed(order) {
  orders.set(order.id, order);
  return order;
}

module.exports = { findById, update, updateByPaymentId, _seed };
