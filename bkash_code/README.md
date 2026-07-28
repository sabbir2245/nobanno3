# bKash Tokenized Checkout Integration (Node.js / Express)

Implements Leg 1 of the payment spec: **Customer → Admin (your merchant bKash account)**.
Money for Leg 2 (Admin → Farmer bank payout) is handled separately via the BEFTN CSV invoice, not this code.

## What this is
- `config/bkash.js` — reads credentials/URLs from env vars.
- `services/bkashService.js` — talks to the bKash API: grant/refresh token, create payment, execute payment, query payment, refund. This is the only file that calls bKash directly.
- `routes/bkashRoutes.js` — Express routes your frontend calls: create a payment, handle bKash's redirect callback, check status, issue refunds.
- `models/orderStore.js` — **placeholder** in-memory store standing in for your real database. Swap its 4 functions for real DB calls; nothing else needs to change.
- `.env.example` — copy to `.env`. Ships with bKash's public sandbox credentials so you can test immediately.

## Setup
```bash
npm install express axios dotenv
cp .env.example .env
```
Wire the router into your app:
```js
require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());
app.use('/api/payments/bkash', require('./routes/bkashRoutes'));
app.listen(4000);
```

## Payment flow
1. Customer checks out on your site → frontend calls `POST /api/payments/bkash/create` with `{ orderId }`.
2. Backend calls bKash's Create Payment API, saves `paymentID` on the order, returns `bkashURL`.
3. Frontend redirects the browser to `bkashURL`. Customer picks their bKash wallet, enters OTP + PIN on bKash's own hosted page — **you never see or handle the customer's bKash PIN**.
4. bKash redirects back to your `BKASH_CALLBACK_URL` (`/api/payments/bkash/callback`) with `paymentID` and `status`.
5. Backend calls Execute Payment to finalize, marks the order `paid`, records the `trxID`, redirects the customer to a success/failure page in your app.
6. (Optional/cron) `GET /api/payments/bkash/status/:paymentID` re-checks any order stuck in `initiated` — useful if a customer closes the tab mid-flow.

## Minimal frontend call (any framework)
```js
async function payWithBkash(orderId) {
  const res = await fetch('/api/payments/bkash/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId }),
  });
  const { bkashURL } = await res.json();
  window.location.href = bkashURL; // send the customer to bKash's hosted checkout
}
```

## Testing (sandbox)
- Base URL, credentials, and test wallets are already in `.env.example`.
- Test wallets: `01770618575`, `01929918378`, `01770618576`, `01877722345` (success); `01823074817` (insufficient balance); `01823074818` (debit block).
- PIN `12121`, OTP `123456` for all sandbox wallets.
- The bKash sandbox blocks browser CORS — all calls must go through your backend (already the case here).
- If testing locally, expose your callback URL with a tool like ngrok so bKash's redirect can reach it.

## Going live
1. Register as a bKash merchant and request live Tokenized Checkout API access (bKash support: 16247, or your Relationship Manager).
2. Replace `.env` values with your live `BKASH_USERNAME`, `BKASH_PASSWORD`, `BKASH_APP_KEY`, `BKASH_APP_SECRET`.
3. Set `BKASH_SANDBOX=false`.
4. Point `BKASH_CALLBACK_URL` at your real production domain.
5. Do one small real-money test transaction before opening to all customers.

## Security notes
- `BKASH_APP_SECRET` and `BKASH_PASSWORD` must never reach the frontend — all calls in this code already run server-side only.
- Always generate a unique `merchantInvoiceNumber` (your `orderId`) per payment attempt; bKash rejects duplicates.
- Treat the callback redirect as a *hint*, not proof of payment — this code always calls Execute (and falls back to Query) before marking an order paid, rather than trusting the query string alone.
