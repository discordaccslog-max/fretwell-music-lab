<?php
/**
 * Credentials template — copy to .credentials.php on the server and fill in real values.
 * The real .credentials.php is gitignored and lives only on the Cloudways server
 * at /home/master/applications/<app-id>/public_html/buy/.credentials.php
 *
 * Dot-prefix (.credentials.php) ensures Nginx returns 403 to any HTTP request.
 * File mode 644, owner master_<app-id>:www-data.
 */

// ─── Muadata API credentials ───
define('MUADATA_API_USER',     '<your-muadata-username>');
define('MUADATA_PRIVATE_KEY',  '<your-muadata-private-key>');
define('MUADATA_WEBSITE',      'fretwellmusic.live'); // DOMAIN STRING for sites that are both Site A and Site B

// ─── Stripe credentials — ACTIVE account in rotation ───
// To swap Stripe accounts (sandbox→live, or rotate between accounts):
//   1) Add https://<siteb-domain>/webhooks/stripe.php as a webhook endpoint
//      in the new account's Stripe dashboard (Developers → Webhooks)
//   2) Subscribe to: checkout.session.completed,
//                    checkout.session.async_payment_succeeded,
//                    checkout.session.async_payment_failed
//   3) Copy the new signing secret + new secret key
//   4) Replace the three STRIPE_* constants below. No code changes elsewhere.
define('STRIPE_SECRET_KEY',     '');    // sk_test_... (sandbox) or sk_live_... (production)
define('STRIPE_WEBHOOK_SECRET', '');    // whsec_... from Stripe dashboard → Webhooks → signing secret
define('STRIPE_MODE',           'test'); // 'test' | 'live' — label for logs/diagnostics

// ─── Future processor credentials (Square, PayPal, etc.) go here ───
// See MUADATA-INTEGRATION-GUIDE.md Section 19 for the webhook pattern per processor.
