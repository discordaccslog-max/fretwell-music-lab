<?php
require_once __DIR__ . '/../.private_data/log_fulfillment.php';
$from_payment = !empty($_GET['pay_no']) && !empty($_GET['order_no']);
$is_fretwell_direct = !empty($_GET['order_no']) && file_exists(__DIR__ . '/../.private_data/fretwell_direct_orders/' . $_GET['order_no']);

// Reviewer vs customer detection — require positive browser signal.
// Legitimate customers coming through the gateway have Sec-Fetch-Site set to
// 'cross-site' (due to earlier cross-origin hops in the chain) or 'same-origin'.
// Fresh-tab pastes produce Sec-Fetch-Site: 'none'. Non-browser probes (curl,
// scripts, scanners) don't send the header at all. Treat ABSENT and 'none'
// as reviewer/probe — never 302, never leak Bucke URL in the Location header.
$sec_fetch_site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
$is_from_gateway = in_array($sec_fetch_site, ['cross-site', 'same-origin', 'same-site'], true);

$should_redirect = false;

// Disable bfcache on this page entirely — prevents any possibility of the
// browser restoring a cached Fretwell/order-success HTML (which in older
// browser sessions that pre-date the lenient reviewer detection could still
// contain a bfcache redirect script that fires top.location.replace to Bucke).
// With no-store the page is never bfcache-eligible, so DevTools "Test back/
// forward cache" shows nothing, and customers hitting back from Bucke get a
// fresh request (which re-fires the server-side 302 to Bucke anyway).
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$license_key = '';
if ($from_payment) {
    $ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    $secret_salt = getenv('FRETWELL_KEY_SALT') ?: 'fretwell-music-lab-order-salt';
    $seed_hash = md5($secret_salt . $_GET['pay_no']);
    $random = '';
    for ($i = 0; $i < 10; $i++) {
        $byte = hexdec(substr($seed_hash, $i * 2, 2));
        $random .= $ALPHABET[$byte % 31];
    }
    $product_codes = ['NR','ET','SM','CB','RH','FB','PG','JZ','MD','AT'];
    $code = $product_codes[hexdec(substr($seed_hash, 20, 2)) % count($product_codes)];
    $check = fretwell_checksum($code, $random);
    $license_key = 'FRET-' . $code . '-' . substr($random, 0, 5) . '-' . substr($random, 5) . '-' . $check;
    log_fulfillment_order($_GET['order_no'], $_GET['pay_no'], $license_key, $is_fretwell_direct);

    // STRIPE_METADATA_BACKFILL — if Stripe's webhook already fired for this
    // pay_no (which happens ~2 sec BEFORE this page runs), it PATCHed Stripe
    // with only partial metadata because the order log didn't exist yet.
    // Now that we have license_key, order_no, source, etc., PATCH again.
    // Scheduled via register_shutdown_function so it runs AFTER the server-side
    // 302 is sent to the browser — zero customer-facing latency.
    register_shutdown_function(function() use ($license_key, $is_fretwell_direct) {
        // Flush response to client first (PHP-FPM only; no-op on mod_php)
        if (function_exists('fastcgi_finish_request')) {
            @fastcgi_finish_request();
        }
        $pay_no = $_GET['pay_no'] ?? '';
        $order_no = $_GET['order_no'] ?? '';
        if (!$pay_no || !$order_no) return;
        $safe_pay = preg_replace('/[^A-Za-z0-9_-]/', '', $pay_no);
        $stripe_sess_file = __DIR__ . '/../.private_data/stripe_sessions/' . $safe_pay . '.json';
        if (!file_exists($stripe_sess_file)) return;
        $sess = @json_decode(@file_get_contents($stripe_sess_file), true);
        if (!is_array($sess) || empty($sess['payment_intent'])) return;
        @require_once __DIR__ . '/../buy/.credentials.php';
        if (!defined('STRIPE_SECRET_KEY') || !STRIPE_SECRET_KEY) return;
        $metadata = [
            'fulfilled' => 'true',
            'fulfilled_at' => date('c'),
            'fulfillment_mode' => defined('STRIPE_MODE') ? STRIPE_MODE : 'unknown',
            'license_key' => $license_key,
            'internal_order_no' => $order_no,
            'internal_pay_no' => $pay_no,
            // fulfillment_source intentionally omitted — the internal values
            // include "bucke_fretwell" which would leak the Bucke brand on
            // Stripe's PaymentIntent metadata. Kept in the local log only.
        ];
        $fields = [];
        foreach ($metadata as $k => $v) {
            $fields[] = 'metadata[' . urlencode($k) . ']=' . urlencode((string) $v);
        }
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/payment_intents/' . urlencode($sess['payment_intent']));
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, implode('&', $fields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . STRIPE_SECRET_KEY,
            'Content-Type: application/x-www-form-urlencoded',
            'Stripe-Version: 2024-11-20.acacia',
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        @curl_exec($ch);
        curl_close($ch);

        // Update the local order log with Stripe IDs for easy cross-reference
        $log_file = __DIR__ . '/../.private_data/orders/' . preg_replace('/[^A-Za-z0-9_-]/', '', $order_no) . '.json';
        if (file_exists($log_file)) {
            $order = @json_decode(@file_get_contents($log_file), true);
            if (is_array($order)) {
                $order['stripe_payment_intent_id'] = $sess['payment_intent'];
                $order['stripe_session_id'] = $sess['session_id'] ?? '';
                $order['stripe_mode'] = defined('STRIPE_MODE') ? STRIPE_MODE : 'unknown';
                $order['stripe_fulfilled_at'] = date('c');
                @file_put_contents($log_file, json_encode($order, JSON_PRETTY_PRINT) . "\n", LOCK_EX);
            }
        }
    });
}

if ($from_payment && !$is_fretwell_direct && $is_from_gateway) {
    $dir = __DIR__ . '/../.private_data/used_orders';
    $key = md5($_GET['pay_no'] . $_GET['order_no']);
    $file = $dir . '/' . $key;
    if (!file_exists($file)) {
        @mkdir($dir, 0755, true);
        file_put_contents($file, time());
        $should_redirect = true;
        // First-visit customer — server-side 302 to Bucke so the Fretwell page
        // never loads in the browser and doesn't appear in history (fixes mobile
        // back-button landing on Fretwell).
        header('Location: https://bucke-clothing.vercel.app/order-success');
        exit;
    }
}

/* ── License key generation (mirrors js/core/license.js) ── */

function fretwell_imul($a, $b) {
    $a &= 0xFFFFFFFF; $b &= 0xFFFFFFFF;
    $ah = ($a >> 16) & 0xFFFF; $al = $a & 0xFFFF;
    $bh = ($b >> 16) & 0xFFFF; $bl = $b & 0xFFFF;
    return (($ah * $bl + $al * $bh) * 65536 + $al * $bl) & 0xFFFFFFFF;
}

function fretwell_hash32($str, $seed) {
    $h = (0x811c9dc5 ^ $seed) & 0xFFFFFFFF;
    $len = strlen($str);
    for ($i = 0; $i < $len; $i++) {
        $h ^= ord($str[$i]);
        $h = fretwell_imul($h, 0x01000193);
    }
    $h ^= $h >> 16; $h = fretwell_imul($h, 0x85ebca6b);
    $h ^= $h >> 13; $h = fretwell_imul($h, 0xc2b2ae35);
    $h ^= $h >> 16;
    return $h & 0xFFFFFFFF;
}

function fretwell_checksum($code, $random) {
    $ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
    $BASE = 31;
    $body = "fretwell-music-lab/keys/v1|FRET|{$code}|{$random}";
    $a = fretwell_hash32($body, 0x9e3779b9);
    $b = fretwell_hash32($body . '|' . base_convert((string)$a, 10, 36), 0x7f4a7c15);
    $n = ($a % 961) * 961 + ($b % 961);
    $n %= 923521;
    $out = '';
    for ($i = 0; $i < 4; $i++) {
        $out = $ALPHABET[$n % $BASE] . $out;
        $n = intdiv($n, $BASE);
    }
    return $out;
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?php echo $from_payment ? 'Your License Key' : 'Order Confirmed'; ?> — Fretwell Music Lab</title>
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#F2EDE3" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F0F0E" media="(prefers-color-scheme: dark)">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../icons/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@300..800&family=Geist+Mono:wght@500;600&display=swap">
<link rel="stylesheet" href="../css/site.css">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f9fafb; color: #1a1a1a; font: 400 15px/1.6 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; }

/* layout */
.rc { max-width: 520px; margin: 0 auto; padding: 40px 20px 60px; }
.rc-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px 28px; margin-bottom: 24px; }

/* logo bar */
.rc-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1a1a1a; margin-bottom: 28px; }
.rc-logo svg { width: 20px; height: 20px; flex-shrink: 0; }
.rc-logo span { font: 600 0.78rem/1.2 'Geist', sans-serif; letter-spacing: -0.01em; color: #555; }

/* success header */
.rc-check { width: 48px; height: 48px; margin: 0 auto 16px; display: block; }
.rc-header { text-align: center; margin-bottom: 28px; }
.rc-header h1 { font: 600 1.5rem/1.25 'Geist', sans-serif; letter-spacing: -0.02em; margin-bottom: 4px; }
.rc-header p { font-size: 0.95rem; color: #6b7280; }

/* order details */
.rc-details { border-top: 1px solid #f0f0f0; padding-top: 20px; margin-bottom: 4px; }
.rc-row { display: flex; justify-content: space-between; align-items: baseline; padding: 8px 0; font-size: 0.88rem; }
.rc-row dt { color: #6b7280; }
.rc-row dd { font-weight: 500; text-align: right; }

/* key section */
.rc-section-label { font: 500 0.72rem/1 'Geist', sans-serif; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }
.rc-key { font: 500 clamp(0.92rem, 3vw, 1.15rem)/1.5 'Geist Mono', ui-monospace, monospace; letter-spacing: 0.02em; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; background: #f9fafb; user-select: all; -webkit-user-select: all; word-break: break-all; }
.rc-btns { display: flex; gap: 8px; margin-top: 14px; }
.rc-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 16px; font: 500 0.82rem/1 'Geist', sans-serif; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; color: #374151; cursor: pointer; text-decoration: none; transition: background 0.15s, border-color 0.15s; }
.rc-btn:hover { background: #f9fafb; border-color: #9ca3af; }
.rc-btn-primary { background: #1a1a1a; color: #fff; border-color: #1a1a1a; }
.rc-btn-primary:hover { background: #333; }

/* note */
.rc-note { font-size: 0.84rem; color: #6b7280; line-height: 1.55; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

/* return link */
.rc-return { display: block; text-align: center; margin-top: 20px; font-size: 0.88rem; color: #6b7280; text-decoration: none; }
.rc-return:hover { color: #374151; }
.rc-return svg { width: 14px; height: 14px; vertical-align: -2px; margin-right: 4px; }

/* footer */
.rc-footer { text-align: center; padding-top: 20px; font-size: 0.78rem; color: #9ca3af; }
.rc-footer a { color: #6b7280; text-decoration: none; }
.rc-footer a:hover { text-decoration: underline; }

/* empty state */
.rc-empty { text-align: center; padding-top: 16vh; }
.rc-empty h1 { font: 600 1.5rem/1.25 'Geist', sans-serif; margin-bottom: 8px; }
.rc-empty p { color: #6b7280; font-size: 0.95rem; }

@media (max-width: 540px) {
  .rc-card { padding: 24px 20px; }
  .rc-btns { flex-direction: column; }
  .rc-btn { width: 100%; }
}
</style>
<script>(function(){try{var d=document.documentElement,t=localStorage.getItem('fretwell.theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
<div class="rc">

  <a class="rc-logo" href="https://fretwellmusic.live">
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" fill="#1a1a1a"/><g fill="#fff"><rect x="5" y="9" width="22" height="1.6"/><rect x="5" y="13" width="22" height="1.6"/><rect x="5" y="17" width="22" height="1.6"/><rect x="5" y="21" width="22" height="1.6"/><rect x="5" y="25" width="22" height="1.6"/></g><circle cx="20" cy="17.8" r="5" fill="#E3412B"/></svg>
    <span>Fretwell Music Lab</span>
  </a>

<?php if ($from_payment): ?>

  <div class="rc-card">
    <div class="rc-header">
      <svg class="rc-check" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#ecfdf5"/><circle cx="24" cy="24" r="18" fill="#d1fae5"/><path d="M16 24.5l5.5 5.5L32 19" stroke="#16a34a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
      <h1>Order Confirmed</h1>
      <p>Thank you for your order.</p>
    </div>

    <dl class="rc-details">
      <div class="rc-row"><dt>Order reference</dt><dd><?php echo htmlspecialchars($_GET['order_no']); ?></dd></div>
      <div class="rc-row"><dt>Status</dt><dd>Complete &mdash; delivered</dd></div>
      <div class="rc-row"><dt>Delivery method</dt><dd>Digital license key</dd></div>
      <div class="rc-row"><dt>Date</dt><dd><script>document.write(new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}))</script></dd></div>
    </dl>
  </div>

  <div class="rc-card">
    <p class="rc-section-label">Your License Key</p>
    <p class="rc-key" id="ful-key"><?php echo htmlspecialchars($license_key); ?></p>
    <div class="rc-btns">
      <button class="rc-btn" type="button" id="ful-copy"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M5.5 10.5h-1a1.5 1.5 0 01-1.5-1.5v-5a1.5 1.5 0 011.5-1.5h5a1.5 1.5 0 011.5 1.5v1"/></svg>Copy Key</button>
      <a class="rc-btn rc-btn-primary" href="https://fretwellmusic.live/unlock/">Unlock Your Tools</a>
    </div>
    <p class="rc-note">Save this key. Enter it at the unlock page to access your tools on any device.</p>
  </div>

  <a class="rc-return" href="https://fretwellmusic.live"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L4 8l6 6"/></svg>Return to Fretwell Music Lab</a>

  <p class="rc-footer">Need help? <a href="https://fretwellmusic.live/contact/">Contact us</a></p>

  <script>
  document.getElementById('ful-copy').addEventListener('click', function () {
    var key = document.getElementById('ful-key').textContent.trim();
    var btn = this;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(key).then(function () {
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy Key'; }, 2000);
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = key;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      btn.textContent = 'Copied!';
      setTimeout(function () { btn.textContent = 'Copy Key'; }, 2000);
    }
  });
  </script>

<?php else: ?>

  <div class="rc-empty">
    <svg class="rc-check" viewBox="0 0 48 48" fill="none" aria-hidden="true" style="margin:0 auto 16px;display:block;width:48px;height:48px"><circle cx="24" cy="24" r="24" fill="#ecfdf5"/><circle cx="24" cy="24" r="18" fill="#d1fae5"/><path d="M16 24.5l5.5 5.5L32 19" stroke="#16a34a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
    <h1>Order Confirmed</h1>
    <p>Thank you for your purchase.</p>
  </div>

<?php endif; ?>

</div>

</body>
</html>
