// config/bkash.js
// Central config for bKash Tokenized Checkout API.
// All secrets come from environment variables — never hardcode them.

const isSandbox = process.env.BKASH_SANDBOX === 'true';

module.exports = {
  isSandbox,

  // Sandbox vs Live base URL (bKash Tokenized Checkout v1.2.0-beta)
  baseURL: isSandbox
    ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
    : 'https://tokenized.pay.bka.sh/v1.2.0-beta',

  username: process.env.BKASH_USERNAME,   // merchant login username (given by bKash)
  password: process.env.BKASH_PASSWORD,   // merchant login password (given by bKash)
  appKey: process.env.BKASH_APP_KEY,      // app key (given by bKash)
  appSecret: process.env.BKASH_APP_SECRET,// app secret (given by bKash)

  // Where bKash redirects the customer's browser back to after payment
  callbackURL: process.env.BKASH_CALLBACK_URL || 'http://localhost:4000/api/payments/bkash/callback',
};
