// services/bkashService.js
//
// Wraps the bKash Tokenized Checkout API (Grant Token, Create Payment,
// Execute Payment, Query Payment, Refund). This runs ONLY on the backend —
// bKash sandbox/live APIs block CORS from browsers, and app secret/password
// must never reach the frontend.
//
// Docs: https://developer.bka.sh/docs/tokenized-checkout-overview

const axios = require('axios');
const bkashConfig = require('../config/bkash');

// --- In-memory token cache -------------------------------------------------
// id_token is valid for 1 hour, refresh_token for 28 days.
// In production, persist these in Redis/DB instead of memory so they
// survive restarts and are shared across server instances.
let tokenCache = {
  idToken: null,
  refreshToken: null,
  expiresAt: 0, // epoch ms
};

function commonHeaders(idToken) {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    authorization: idToken,
    'x-app-key': bkashConfig.appKey,
  };
}

/**
 * Get a valid id_token, requesting a new one (or refreshing) only when needed.
 */
async function getToken() {
  const now = Date.now();

  // Reuse cached token if it still has more than 60s of life left.
  if (tokenCache.idToken && tokenCache.expiresAt - now > 60_000) {
    return tokenCache.idToken;
  }

  // Try refreshing first if we have a refresh_token.
  if (tokenCache.refreshToken) {
    try {
      return await refreshToken();
    } catch (err) {
      // fall through to a full grant if refresh fails (e.g. expired after 28 days)
    }
  }

  return grantToken();
}

/**
 * POST /tokenized/checkout/token/grant
 * Issues a brand-new id_token + refresh_token using merchant credentials.
 */
async function grantToken() {
  const url = `${bkashConfig.baseURL}/tokenized/checkout/token/grant`;

  const { data } = await axios.post(
    url,
    {
      app_key: bkashConfig.appKey,
      app_secret: bkashConfig.appSecret,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password,
      },
    }
  );

  if (!data || !data.id_token) {
    throw new Error(`bKash grant token failed: ${JSON.stringify(data)}`);
  }

  cacheToken(data);
  return data.id_token;
}

/**
 * POST /tokenized/checkout/token/refresh
 * Cheaper than a full grant; use while refresh_token is still valid (28 days).
 */
async function refreshToken() {
  const url = `${bkashConfig.baseURL}/tokenized/checkout/token/refresh`;

  const { data } = await axios.post(
    url,
    {
      app_key: bkashConfig.appKey,
      app_secret: bkashConfig.appSecret,
      refresh_token: tokenCache.refreshToken,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        username: bkashConfig.username,
        password: bkashConfig.password,
      },
    }
  );

  if (!data || !data.id_token) {
    throw new Error(`bKash refresh token failed: ${JSON.stringify(data)}`);
  }

  cacheToken(data);
  return data.id_token;
}

function cacheToken(data) {
  tokenCache = {
    idToken: data.id_token,
    refreshToken: data.refresh_token || tokenCache.refreshToken,
    // id_token is valid ~1 hour; refresh 5 minutes early to be safe.
    expiresAt: Date.now() + 55 * 60 * 1000,
  };
}

/**
 * POST /tokenized/checkout/create
 * Starts a payment session for a customer order. Returns a bkashURL that
 * the frontend should redirect the customer to in order to complete payment.
 *
 * @param {Object} params
 * @param {string} params.amount              e.g. "500" (as a string, BDT, no decimals issue)
 * @param {string} params.orderId              your internal order ID -> merchantInvoiceNumber
 * @param {string} [params.payerReference]     e.g. customer phone number, optional but recommended
 */
async function createPayment({ amount, orderId, payerReference }) {
  const idToken = await getToken();
  const url = `${bkashConfig.baseURL}/tokenized/checkout/create`;

  const { data } = await axios.post(
    url,
    {
      mode: '0011', // 0011 = Checkout (Tokenized), the standard consumer checkout mode
      payerReference: payerReference || orderId,
      callbackURL: bkashConfig.callbackURL,
      amount: String(amount),
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: orderId, // must be unique per payment attempt
    },
    { headers: commonHeaders(idToken) }
  );

  if (!data || data.statusCode !== '0000') {
    throw new Error(`bKash create payment failed: ${JSON.stringify(data)}`);
  }

  // data.paymentID  -> store against the order, needed to execute/query later
  // data.bkashURL   -> redirect the customer's browser here to pay
  return data;
}

/**
 * POST /tokenized/checkout/execute
 * Call this after the customer completes wallet/OTP/PIN steps and bKash
 * redirects back to your callbackURL with ?paymentID=...&status=success.
 * This finalizes the transaction and actually moves the money.
 */
async function executePayment(paymentID) {
  const idToken = await getToken();
  const url = `${bkashConfig.baseURL}/tokenized/checkout/execute`;

  const { data } = await axios.post(
    url,
    { paymentID },
    { headers: commonHeaders(idToken) }
  );

  return data; // check data.transactionStatus === 'Completed' and data.statusCode === '0000'
}

/**
 * POST /tokenized/checkout/payment/status
 * Use for reconciliation — e.g. a cron job double-checking any payment
 * that never got a clean callback, before trusting it as "paid".
 */
async function queryPayment(paymentID) {
  const idToken = await getToken();
  const url = `${bkashConfig.baseURL}/tokenized/checkout/payment/status`;

  const { data } = await axios.post(
    url,
    { paymentID },
    { headers: commonHeaders(idToken) }
  );

  return data;
}

/**
 * POST /tokenized/checkout/payment/refund
 * Full or partial refund of a completed payment. Requires the trxID
 * returned from a completed executePayment/queryPayment call.
 */
async function refundPayment({ paymentID, trxID, amount, reason, sku }) {
  const idToken = await getToken();
  const url = `${bkashConfig.baseURL}/tokenized/checkout/payment/refund`;

  const { data } = await axios.post(
    url,
    {
      paymentID,
      trxID,
      amount: String(amount),
      sku: sku || 'refund',
      reason: reason || 'Customer requested refund',
    },
    { headers: commonHeaders(idToken) }
  );

  return data;
}

module.exports = {
  createPayment,
  executePayment,
  queryPayment,
  refundPayment,
};
