// routes/bkashRoutes.js
//
// Mount in your app: app.use('/api/payments/bkash', require('./routes/bkashRoutes'));
//
// Flow:
//   1. Frontend calls POST /create with { orderId } after checkout.
//   2. Backend calls bKash createPayment, stores paymentID on the order,
//      returns bkashURL to the frontend.
//   3. Frontend redirects the browser to bkashURL. Customer completes
//      wallet/OTP/PIN on bKash's hosted page.
//   4. bKash redirects back to GET/POST /callback with paymentID & status.
//   5. Backend calls executePayment to finalize, marks order paid, and
//      redirects the customer to a success/failure page in your app.

const express = require('express');
const router = express.Router();
const bkashService = require('../services/bkashService');

// Replace these with your real data-access layer (DB models, ORM, etc).
const Orders = require('../models/orderStore'); // simple example store, see file

/**
 * POST /api/payments/bkash/create
 * Body: { orderId: string }
 * Starts a bKash payment for an existing order and returns the bKash
 * checkout URL for the frontend to redirect the customer to.
 */
router.post('/create', async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Orders.findById(orderId);

    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }

    const payment = await bkashService.createPayment({
      amount: order.totalAmount,
      orderId: order.id,
      payerReference: order.customerPhone,
    });

    await Orders.update(order.id, {
      bkashPaymentID: payment.paymentID,
      paymentStatus: 'initiated',
    });

    return res.json({
      paymentID: payment.paymentID,
      bkashURL: payment.bkashURL, // frontend should redirect the browser here
    });
  } catch (err) {
    console.error('bKash create payment error:', err.message);
    return res.status(500).json({ error: 'Failed to initiate bKash payment' });
  }
});

/**
 * GET/POST /api/payments/bkash/callback
 * bKash redirects the customer's browser here after they finish (or cancel)
 * the payment on bKash's hosted checkout page.
 * Query params typically include: paymentID, status ('success' | 'failure' | 'cancel')
 */
router.all('/callback', async (req, res) => {
  const { paymentID, status } = { ...req.query, ...req.body };

  if (!paymentID) {
    return res.redirect('/payment/failed?reason=missing_payment_id');
  }

  if (status !== 'success') {
    // Customer cancelled or payment failed before execute step.
    await Orders.updateByPaymentId(paymentID, { paymentStatus: 'failed' });
    return res.redirect(`/payment/failed?paymentID=${paymentID}`);
  }

  try {
    const result = await bkashService.executePayment(paymentID);

    if (result.statusCode === '0000' && result.transactionStatus === 'Completed') {
      await Orders.updateByPaymentId(paymentID, {
        paymentStatus: 'paid',
        bkashTrxId: result.trxID,
        paidAmount: result.amount,
        paidAt: new Date(),
      });
      return res.redirect(`/payment/success?paymentID=${paymentID}`);
    }

    // Not completed — could be duplicate execute, expired session, etc.
    // Fall back to an explicit status check before giving up.
    const statusCheck = await bkashService.queryPayment(paymentID);
    if (statusCheck.transactionStatus === 'Completed') {
      await Orders.updateByPaymentId(paymentID, {
        paymentStatus: 'paid',
        bkashTrxId: statusCheck.trxID,
        paidAmount: statusCheck.amount,
        paidAt: new Date(),
      });
      return res.redirect(`/payment/success?paymentID=${paymentID}`);
    }

    await Orders.updateByPaymentId(paymentID, { paymentStatus: 'failed' });
    return res.redirect(`/payment/failed?paymentID=${paymentID}`);
  } catch (err) {
    console.error('bKash execute payment error:', err.message);
    await Orders.updateByPaymentId(paymentID, { paymentStatus: 'failed' });
    return res.redirect(`/payment/failed?paymentID=${paymentID}`);
  }
});

/**
 * GET /api/payments/bkash/status/:paymentID
 * On-demand reconciliation check (e.g. for an admin "verify payment" button,
 * or a cron job sweeping any orders stuck in "initiated").
 */
router.get('/status/:paymentID', async (req, res) => {
  try {
    const result = await bkashService.queryPayment(req.params.paymentID);
    return res.json(result);
  } catch (err) {
    console.error('bKash query payment error:', err.message);
    return res.status(500).json({ error: 'Failed to query bKash payment status' });
  }
});

/**
 * POST /api/payments/bkash/refund
 * Body: { orderId, amount, reason }
 * Admin-only route — protect with your auth/role middleware.
 */
router.post('/refund', async (req, res) => {
  try {
    const { orderId, amount, reason } = req.body;
    const order = await Orders.findById(orderId);

    if (!order || !order.bkashPaymentID || !order.bkashTrxId) {
      return res.status(400).json({ error: 'Order has no completed bKash payment to refund' });
    }

    const result = await bkashService.refundPayment({
      paymentID: order.bkashPaymentID,
      trxID: order.bkashTrxId,
      amount: amount || order.paidAmount,
      reason,
    });

    if (result.statusCode === '0000') {
      await Orders.update(order.id, { paymentStatus: 'refunded' });
    }

    return res.json(result);
  } catch (err) {
    console.error('bKash refund error:', err.message);
    return res.status(500).json({ error: 'Failed to process bKash refund' });
  }
});

module.exports = router;
