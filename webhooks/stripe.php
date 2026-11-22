<?php
/**
 * Stripe webhook endpoint — proof-of-fulfillment feedback to Stripe.
 *
 * Receives checkout.session.completed and async events from Stripe,
 * verifies the signature, fetches line_items via Stripe API to extract
 * the Muadata pay_no (which lives in line_items[0].description because
 * Muadata's "{order_number}" Order Description template resolves to
 * pay_no, NOT our internal order_id — session.description is always
 * empty on Muadata-created sessions).
 *
 * Then matches the session to our local order log via pay_no and
 * PATCHes the PaymentIntent on Stripe with fulfillment metadata so
 * the fulfillment record is visible on Stripe's own object.
 *
 * Note: this webhook typically fires 2-3 seconds BEFORE order-success/index.php
 * runs (Stripe's webhook is server-to-server fast, the customer's browser
 * redirect chain to order-success takes longer). On first attempt we may not
 * find a matching order log — we PATCH partial metadata (fulfilled, fulfilled_at)
 * and return 200. Then order-success runs a few seconds later and executes a
 * second PATCH via its STRIPE_METADATA_BACKFILL register_shutdown_function block,
 * filling in license_key, internal_order_no, etc. The combined effect is that
 * Stripe's PaymentIntent eventually carries the complete metadata.
 *
 * Config in ../buy/.credentials.php:
 *   STRIPE_SECRET_KEY       — sk_test_... or sk_live_...
 *   STRIPE_WEBHOOK_SECRET   — whsec_...
 *   STRIPE_MODE             — 'test' | 'live'
 *
 * Swap to a new Stripe account:
 *   1) Add this URL (https://<siteb-domain>/webhooks/stripe.php) to the
 *      new account's Webhooks dashboard. Subscribe to:
 *        - checkout.session.completed
 *        - checkout.session.async_payment_succeeded
 *        - checkout.session.async_payment_failed
 *   2) Copy the new signing secret + new secret key.
 *   3) Update the three STRIPE_* constants in .credentials.php. Done.
 */

require_once __DIR__ . '/../buy/.credentials.php';

ini_set('display_errors', '0');
ini_set('log_errors', '1');

$event_log = __DIR__ . '/../.private_data/stripe_webhook_events.log';
$sessions_dir = __DIR__ . '/../.private_data/stripe_sessions';
$orders_dir = __DIR__ . '/../.private_data/orders';

function log_event($data) {
    global $event_log;
    @file_put_contents(
        $event_log,
        json_encode(array_merge(['timestamp' => date('c')], $data)) . "\n",
        FILE_APPEND | LOCK_EX
    );
}

/* ── Stripe signature verification (pure PHP, no SDK) ── */
function verify_stripe_signature($payload, $sig_header, $secret, $tolerance = 300) {
    if (!$payload || !$sig_header || !$secret) return false;
    $parts = [];
    foreach (explode(',', $sig_header) as $segment) {
        $kv = explode('=', $segment, 2);
        if (count($kv) === 2) $parts[$kv[0]][] = $kv[1];
    }
    if (empty($parts['t']) || empty($parts['v1'])) return false;
    $ts = (int) $parts['t'][0];
    if (abs(time() - $ts) > $tolerance) return false;
    $signed_payload = $ts . '.' . $payload;
    $expected = hash_hmac('sha256', $signed_payload, $secret);
    foreach ($parts['v1'] as $sig) {
        if (hash_equals($expected, $sig)) return true;
    }
    return false;
}

/* ── Stripe API: PATCH PaymentIntent metadata ── */
function patch_payment_intent_metadata($pi_id, $metadata) {
    if (!$pi_id || empty($metadata)) return ['ok' => false, 'reason' => 'missing_args'];

    $fields = [];
    foreach ($metadata as $k => $v) {
        $fields[] = 'metadata[' . urlencode($k) . ']=' . urlencode((string) $v);
    }
    $body = implode('&', $fields);

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/payment_intents/' . urlencode($pi_id));
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        'Content-Type: application/x-www-form-urlencoded',
        'Stripe-Version: 2024-11-20.acacia',
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    $resp = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);

    return [
        'ok' => ($http >= 200 && $http < 300),
        'http_code' => $http,
        'error' => $err,
        'body_excerpt' => substr((string) $resp, 0, 200),
    ];
}

/* ── Entry point ── */

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    log_event(['result' => 'rejected', 'reason' => 'non_post', 'method' => $_SERVER['REQUEST_METHOD']]);
    exit;
}

$payload = file_get_contents('php://input');
$sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

if (!$payload) {
    http_response_code(400);
    log_event(['result' => 'rejected', 'reason' => 'empty_payload']);
    exit;
}

if (!defined('STRIPE_WEBHOOK_SECRET') || !STRIPE_WEBHOOK_SECRET) {
    http_response_code(500);
    log_event(['result' => 'rejected', 'reason' => 'webhook_secret_not_configured']);
    exit;
}

if (!verify_stripe_signature($payload, $sig_header, STRIPE_WEBHOOK_SECRET)) {
    http_response_code(400);
    log_event(['result' => 'rejected', 'reason' => 'invalid_signature']);
    exit;
}

$event = json_decode($payload, true);
if (!$event || !isset($event['type'])) {
    http_response_code(400);
    log_event(['result' => 'rejected', 'reason' => 'invalid_json']);
    exit;
}

$type = $event['type'];
$event_id = $event['id'] ?? '';
$mode = defined('STRIPE_MODE') ? STRIPE_MODE : 'unknown';

// Only care about fulfillment-relevant events
$fulfillment_events = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
];

if (!in_array($type, $fulfillment_events, true)) {
    http_response_code(200);
    log_event(['result' => 'ignored', 'type' => $type, 'event_id' => $event_id, 'mode' => $mode]);
    exit;
}

$session = $event['data']['object'] ?? [];
$session_id = $session['id'] ?? '';
$pi_id = $session['payment_intent'] ?? '';
$amount = $session['amount_total'] ?? 0;
$currency = $session['currency'] ?? '';
$payment_status = $session['payment_status'] ?? '';
$description = $session['description'] ?? '';
$customer_email = $session['customer_details']['email'] ?? ($session['customer_email'] ?? '');
$created = $session['created'] ?? 0;

// Extract pay_no by fetching line_items via Stripe API.
// Muadata's "{order_number}" template resolves to the pay_no (long numeric)
// and lands in Checkout Session line_items[0].description — NOT in
// session.description (which is empty for Muadata-created sessions).
// Webhook event payloads don't include line_items by default, so we
// fetch the full session with the expand parameter.
$order_no = '';
$pay_no = '';
$line_items_fetched = false;
if ($session_id) {
    $ch_li = curl_init();
    curl_setopt($ch_li, CURLOPT_URL, 'https://api.stripe.com/v1/checkout/sessions/' . urlencode($session_id) . '?expand[]=line_items&expand[]=line_items.data.price.product');
    curl_setopt($ch_li, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . STRIPE_SECRET_KEY,
        'Stripe-Version: 2024-11-20.acacia',
    ]);
    curl_setopt($ch_li, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch_li, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch_li, CURLOPT_CONNECTTIMEOUT, 5);
    $li_json = curl_exec($ch_li);
    curl_close($ch_li);
    $full = json_decode((string) $li_json, true);
    if (is_array($full) && isset($full['line_items']['data'][0])) {
        $line_items_fetched = true;
        $li0 = $full['line_items']['data'][0];
        $candidates = [
            $li0['description'] ?? '',
            $li0['price']['product']['name'] ?? '',
            $li0['price']['product']['description'] ?? '',
        ];
        foreach ($candidates as $cand) {
            if (preg_match('/\d{15,}/', (string) $cand, $m)) {
                $pay_no = $m[0];
                break;
            }
        }
    }
}
// Fallback: also check session.description (in case Muadata changes behavior later)
if (!$pay_no && preg_match('/\d{15,}/', $description, $m)) {
    $pay_no = $m[0];
}

// Look up the order record by pay_no (small directory, O(N) scan is fine)
$order_record = null;
if ($pay_no && is_dir($orders_dir)) {
    foreach (glob($orders_dir . '/ORDER_*.json') as $candidate) {
        $data = json_decode(@file_get_contents($candidate), true);
        if (is_array($data) && isset($data['pay_no']) && $data['pay_no'] === $pay_no) {
            $order_record = $data;
            $order_no = $data['order_no'] ?? basename($candidate, '.json');
            break;
        }
    }
}

// Build the metadata we'll push to Stripe
$push_metadata = [
    'fulfilled' => ($type === 'checkout.session.async_payment_failed') ? 'false' : 'true',
    'fulfilled_at' => date('c'),
    'fulfillment_mode' => $mode,
    'event_type' => $type,
];
if ($order_no) {
    $push_metadata['internal_order_no'] = $order_no;
}
if ($order_record) {
    if (!empty($order_record['license_key'])) {
        $push_metadata['license_key'] = $order_record['license_key'];
    }
    if (!empty($order_record['pay_no'])) {
        $push_metadata['internal_pay_no'] = $order_record['pay_no'];
    }
    // fulfillment_source intentionally omitted — the local value includes
    // "bucke_fretwell" which would leak the Bucke brand to anyone viewing
    // the Stripe PaymentIntent metadata. Kept in the local log only.
}

// PATCH Stripe (only for successful events)
$patch_result = null;
if ($pi_id && $type !== 'checkout.session.async_payment_failed') {
    $patch_result = patch_payment_intent_metadata($pi_id, $push_metadata);
}

// Store session cross-reference, keyed by pay_no (or fallbacks) so order-success
// can find the PaymentIntent ID even if the webhook fires first.
if ($session_id) {
    $key = $pay_no ?: ($order_no ?: ('cs_' . substr($session_id, 0, 20)));
    $cross_ref = [
        'session_id' => $session_id,
        'payment_intent' => $pi_id,
        'order_no' => $order_no,
        'pay_no' => $pay_no,
        'amount' => $amount,
        'currency' => $currency,
        'payment_status' => $payment_status,
        'description' => $description,
        'customer_email' => $customer_email,
        'event_type' => $type,
        'event_id' => $event_id,
        'received_at' => date('c'),
        'stripe_mode' => $mode,
    ];
    @file_put_contents(
        $sessions_dir . '/' . preg_replace('/[^A-Za-z0-9_-]/', '', $key) . '.json',
        json_encode($cross_ref, JSON_PRETTY_PRINT) . "\n",
        LOCK_EX
    );
}

// Also update the local order log with the Stripe PaymentIntent ID
if ($order_record && $order_no && $pi_id) {
    $order_record['stripe_payment_intent_id'] = $pi_id;
    $order_record['stripe_session_id'] = $session_id;
    $order_record['stripe_mode'] = $mode;
    $order_record['stripe_fulfilled_at'] = date('c');
    $order_record['stripe_amount'] = $amount;
    $order_record['stripe_currency'] = $currency;
    @file_put_contents(
        $orders_dir . '/' . $order_no . '.json',
        json_encode($order_record, JSON_PRETTY_PRINT) . "\n",
        LOCK_EX
    );
}

log_event([
    'result' => 'processed',
    'type' => $type,
    'event_id' => $event_id,
    'session_id' => $session_id,
    'payment_intent' => $pi_id,
    'order_no' => $order_no ?: '(not_resolved)',
    'pay_no' => $pay_no ?: '(not_found_in_line_items)',
    'line_items_fetched' => $line_items_fetched ? 'yes' : 'no',
    'order_log_found' => $order_record ? 'yes' : 'no',
    'metadata_fields' => array_keys($push_metadata),
    'stripe_patch' => $patch_result,
    'mode' => $mode,
]);

http_response_code(200);
exit;
