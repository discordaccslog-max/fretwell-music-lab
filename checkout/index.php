<?php
require __DIR__ . '/products.php';

// Read credentials from the existing Muadata gateway config.
// The original config.php installed by Muadata defines $api_user, $private_key, $website.
// DO NOT overwrite security_gateway/config.php — it contains the real credentials.
require_once __DIR__ . '/../security_gateway/config.php';

$error = '';
$billing = [];
$is_post = $_SERVER['REQUEST_METHOD'] === 'POST';

if ($is_post) {
    // ── Validate cart items server-side ──
    $raw_items = isset($_POST['items']) && is_array($_POST['items']) ? $_POST['items'] : [];
    $valid_addons = ['planner', 'guide', 'bonus', 'export'];
    $order_lines = [];
    $order_total = 0;
    $order_product = [];

    foreach ($raw_items as $item) {
        $id = isset($item['id']) ? trim($item['id']) : '';
        $product = lookup_product($id);
        if (!$product) { $error = 'Your cart contains an item we could not find. Please go back and try again.'; break; }

        $addons = [];
        if (isset($item['addons']) && is_array($item['addons'])) {
            foreach ($item['addons'] as $a) {
                $a = trim($a);
                if (in_array($a, $valid_addons, true) && isset($product['addons'][$a])) {
                    $addons[] = $a;
                }
            }
        }

        $line_total = calc_line_total($id, $addons);
        $order_lines[] = ['id' => $id, 'name' => $product['name'], 'addons' => $addons, 'total' => $line_total];
        $order_total += $line_total;

        // Build Muadata order_product format
        $order_product[] = [
            'name' => $product['name'],
            'model' => $id,
            'price' => number_format($line_total, 2, '.', ''),
            'quantity' => 1,
            'option' => [],
            'weight' => 0,
            'products_image' => '',
        ];
    }

    if (!$error && empty($order_lines)) {
        $error = 'Your cart is empty. Please add items before checking out.';
    }

    // ── Validate billing fields ──
    $fields = ['first_name', 'last_name', 'email', 'address', 'city', 'state', 'zip', 'country'];
    if (!$error) {
        foreach ($fields as $f) {
            $billing[$f] = isset($_POST[$f]) ? trim($_POST[$f]) : '';
        }
        if (!$billing['first_name'] || !$billing['last_name']) $error = 'Please enter your full name.';
        elseif (!$billing['email'] || !filter_var($billing['email'], FILTER_VALIDATE_EMAIL)) $error = 'Please enter a valid email address.';
        elseif (!$billing['address'] || !$billing['city'] || !$billing['zip'] || !$billing['country']) $error = 'Please complete all billing address fields.';
    }

    // ── Payment method ──
    $pay = (isset($_POST['payment_method']) && $_POST['payment_method'] === 'paypal') ? 'paypal' : 'nolimit';

    // ── Post to Muadata gateway (server-side only) ──
    if (!$error && !empty($api_user) && !empty($private_key)) {
        $order_id = 'ORDER_' . str_replace('-', '_', bin2hex(random_bytes(16)));
        $order_currency = 'USD';
        $order_amount = number_format($order_total, 2, '.', '');

        // sign = MD5(api_user + PrivateKey + order_currency + order_amount + order_id)
        $sign = md5($api_user . $private_key . $order_currency . $order_amount . $order_id);

        $params = http_build_query([
            'order_id' => $order_id,
            'order_currency' => $order_currency,
            'order_amount' => $order_amount,
            'order_product' => json_encode($order_product),
            'pay' => $pay,
            'api_user' => $api_user,
            'website' => $website,
            'sign' => $sign,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
            'lan' => 'en-US',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0',
            'billing_first_name' => $billing['first_name'],
            'billing_last_name' => $billing['last_name'],
            'billing_email' => $billing['email'],
            'billing_phone' => '0000000000',
            'billing_address1' => $billing['address'],
            'billing_city' => $billing['city'],
            'billing_state' => $billing['state'],
            'billing_zip' => $billing['zip'],
            'billing_country' => $billing['country'],
            'shipping_first_name' => $billing['first_name'],
            'shipping_last_name' => $billing['last_name'],
            'shipping_email' => $billing['email'],
            'shipping_phone' => '0000000000',
            'shipping_address1' => $billing['address'],
            'shipping_city' => $billing['city'],
            'shipping_state' => $billing['state'],
            'shipping_zip' => $billing['zip'],
            'shipping_country' => $billing['country'],
            'order_return_uri' => 'https://fretwellmusic.live/order-failed',
            'order_success_uri' => 'https://fretwellmusic.live/order-success',
            'order_notify_uri' => 'https://fretwellmusic.live/order-success',
            'reorder' => 'reorder',
            'jump' => '1',
        ]);

        $ch = curl_init('https://gateway.abpayment.us/create_payment/custom');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $params,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
        ]);
        $response = curl_exec($ch);
        $curl_error = curl_error($ch);
        curl_close($ch);

        if ($curl_error) {
            $error = 'Payment could not be processed. Please try again.';
        } else {
            // Response may be JSON or URL-encoded
            $linkform = null;
            $trimmed = trim($response);
            if (substr($trimmed, 0, 1) === '{') {
                $data = json_decode($trimmed, true);
                $linkform = $data['linkform'] ?? null;
            } else {
                parse_str($trimmed, $parsed);
                $linkform = $parsed['linkform'] ?? null;
            }

            if ($linkform) {
                header('Location: ' . $linkform);
                exit;
            }
            $error = 'Payment could not be processed. Please try again.';
        }
    } elseif (!$error) {
        $error = 'Checkout is not available right now. Please try again later.';
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Checkout — Fretwell Music Lab</title>
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
.ck { max-width: 720px; margin: 0 auto; padding: 32px 20px 80px; }
.ck-back { display: inline-flex; align-items: center; gap: 4px; font-size: 0.88rem; color: var(--ink-50, #6b7280); text-decoration: none; margin-bottom: 24px; }
.ck-back:hover { color: var(--ink, #121212); }
.ck-back svg { width: 14px; height: 14px; }
.ck h1 { font: 600 1.5rem/1.25 'Geist', sans-serif; letter-spacing: -0.02em; margin-bottom: 24px; }

.ck-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; color: #991b1b; font-size: 0.9rem; line-height: 1.5; }

.ck-grid { display: grid; grid-template-columns: 1fr; gap: 32px; }
@media (min-width: 640px) { .ck-grid { grid-template-columns: 1fr 280px; } }

.ck-form fieldset { border: none; padding: 0; margin: 0 0 28px; }
.ck-form legend { font: 600 0.95rem/1.3 'Geist', sans-serif; margin-bottom: 14px; }
.ck-row { display: grid; gap: 12px; margin-bottom: 12px; }
.ck-row-2 { grid-template-columns: 1fr 1fr; }
.ck-row-3 { grid-template-columns: 1fr 1fr 1fr; }
@media (max-width: 480px) { .ck-row-2, .ck-row-3 { grid-template-columns: 1fr; } }

.ck-field { display: flex; flex-direction: column; gap: 4px; }
.ck-field label { font-size: 0.82rem; font-weight: 500; color: var(--ink-50, #6b7280); }
.ck-field input, .ck-field select { height: 40px; padding: 0 12px; font: 400 0.9rem/1 'Geist', sans-serif; border: 1px solid var(--rule, #d1d5db); border-radius: 6px; background: var(--bg, #fff); color: var(--ink, #121212); transition: border-color 0.15s; }
.ck-field input:focus, .ck-field select:focus { outline: none; border-color: var(--cobalt, #2346D3); box-shadow: 0 0 0 3px rgba(35, 70, 211, 0.12); }
.ck-field input.is-invalid { border-color: #ef4444; }

.ck-sidebar { position: sticky; top: 24px; align-self: start; }
.ck-summary { background: var(--bg, #fff); border: 1px solid var(--rule, #e5e7eb); border-radius: 8px; padding: 20px; }
.ck-summary h2 { font: 600 0.95rem/1.3 'Geist', sans-serif; margin-bottom: 14px; }
.ck-items { list-style: none; padding: 0; margin: 0 0 16px; }
.ck-items li { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 0; font-size: 0.85rem; border-bottom: 1px solid var(--rule-light, #f3f4f6); }
.ck-items li:last-child { border-bottom: none; }
.ck-items .ck-item-name { flex: 1; padding-right: 12px; }
.ck-items .ck-item-addons { display: block; font-size: 0.78rem; color: var(--ink-50, #6b7280); }
.ck-items .ck-item-price { font-weight: 500; white-space: nowrap; }
.ck-total { display: flex; justify-content: space-between; padding-top: 12px; border-top: 2px solid var(--ink, #121212); font: 600 1rem/1.3 'Geist', sans-serif; }
.ck-empty-msg { font-size: 0.88rem; color: var(--ink-50, #6b7280); padding: 12px 0; }

.ck-submit { width: 100%; height: 48px; margin-top: 20px; font: 600 0.95rem/1 'Geist', sans-serif; border: none; border-radius: 8px; background: var(--ink, #121212); color: var(--bg, #fff); cursor: pointer; transition: background 0.15s; }
.ck-submit:hover { background: #333; }
.ck-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.ck-secure { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; font-size: 0.78rem; color: var(--ink-50, #6b7280); }
.ck-secure svg { width: 14px; height: 14px; }

.ck-no-js { text-align: center; padding: 48px 20px; }
.ck-no-js p { font-size: 0.95rem; color: var(--ink-50, #6b7280); }
</style>
<script>(function(){try{var d=document.documentElement,t=localStorage.getItem('fretwell.theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
<div class="ck">

  <a class="ck-back" href="../cart/">
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2L4 8l6 6"/></svg>
    Back to cart
  </a>

  <h1>Checkout</h1>

  <?php if ($error): ?>
  <div class="ck-error" role="alert"><?php echo htmlspecialchars($error); ?></div>
  <?php endif; ?>

  <noscript>
    <div class="ck-no-js">
      <p>JavaScript is required to load your cart and complete checkout. Please enable JavaScript and reload this page.</p>
    </div>
  </noscript>

  <div class="ck-grid" id="ck-main" style="display:none;">
    <form class="ck-form" method="post" id="ck-form" novalidate>

      <!-- Hidden cart fields populated by JS -->
      <div id="ck-hidden-items"></div>

      <fieldset>
        <legend>Contact information</legend>
        <div class="ck-row ck-row-2">
          <div class="ck-field">
            <label for="first_name">First name</label>
            <input type="text" id="first_name" name="first_name" required autocomplete="given-name" value="<?php echo htmlspecialchars($billing['first_name'] ?? ''); ?>">
          </div>
          <div class="ck-field">
            <label for="last_name">Last name</label>
            <input type="text" id="last_name" name="last_name" required autocomplete="family-name" value="<?php echo htmlspecialchars($billing['last_name'] ?? ''); ?>">
          </div>
        </div>
        <div class="ck-row">
          <div class="ck-field">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required autocomplete="email" value="<?php echo htmlspecialchars($billing['email'] ?? ''); ?>">
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Billing address</legend>
        <div class="ck-row">
          <div class="ck-field">
            <label for="address">Street address</label>
            <input type="text" id="address" name="address" required autocomplete="street-address" value="<?php echo htmlspecialchars($billing['address'] ?? ''); ?>">
          </div>
        </div>
        <div class="ck-row ck-row-2">
          <div class="ck-field">
            <label for="city">City</label>
            <input type="text" id="city" name="city" required autocomplete="address-level2" value="<?php echo htmlspecialchars($billing['city'] ?? ''); ?>">
          </div>
          <div class="ck-field">
            <label for="state">State / Province</label>
            <input type="text" id="state" name="state" autocomplete="address-level1" value="<?php echo htmlspecialchars($billing['state'] ?? ''); ?>">
          </div>
        </div>
        <div class="ck-row ck-row-2">
          <div class="ck-field">
            <label for="zip">ZIP / Postal code</label>
            <input type="text" id="zip" name="zip" required autocomplete="postal-code" value="<?php echo htmlspecialchars($billing['zip'] ?? ''); ?>">
          </div>
          <div class="ck-field">
            <label for="country">Country</label>
            <select id="country" name="country" required autocomplete="country">
              <option value="">Select…</option>
              <option value="US">United States</option>
              <option value="CA">Canada</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="NL">Netherlands</option>
              <option value="SE">Sweden</option>
              <option value="NO">Norway</option>
              <option value="DK">Denmark</option>
              <option value="FI">Finland</option>
              <option value="IE">Ireland</option>
              <option value="NZ">New Zealand</option>
              <option value="JP">Japan</option>
              <option value="KR">South Korea</option>
              <option value="SG">Singapore</option>
              <option value="BR">Brazil</option>
              <option value="MX">Mexico</option>
              <option value="IN">India</option>
              <option value="ZA">South Africa</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Payment method</legend>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:0.9rem;">
            <input type="radio" name="payment_method" value="card" checked style="margin:0;"> Credit / Debit Card
          </label>
          <label style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1px solid #d1d5db;border-radius:6px;cursor:pointer;font-size:0.9rem;">
            <input type="radio" name="payment_method" value="paypal" style="margin:0;"> PayPal
          </label>
        </div>
        <p style="font-size:0.82rem;color:#6b7280;margin-top:10px;">You'll be redirected to complete payment securely.</p>
      </fieldset>

      <button type="submit" class="ck-submit" id="ck-pay" disabled>Pay now</button>
      <div class="ck-secure">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 016 0v2"/></svg>
        Secure checkout
      </div>
    </form>

    <aside class="ck-sidebar">
      <div class="ck-summary">
        <h2>Order summary</h2>
        <ul class="ck-items" id="ck-items"></ul>
        <div class="ck-total">
          <span>Total</span>
          <span id="ck-total">$0</span>
        </div>
      </div>
    </aside>
  </div>

</div>

<script type="module">
import { cartLines, cartTotal, clearCart } from '../js/cart.js';

const main = document.getElementById('ck-main');
const itemsList = document.getElementById('ck-items');
const totalEl = document.getElementById('ck-total');
const hiddenContainer = document.getElementById('ck-hidden-items');
const payBtn = document.getElementById('ck-pay');
const form = document.getElementById('ck-form');
const countrySelect = document.getElementById('country');

function buildSummary() {
  const lines = cartLines();
  itemsList.textContent = '';
  hiddenContainer.textContent = '';

  if (!lines.length) {
    itemsList.innerHTML = '<li class="ck-empty-msg">Your cart is empty.</li>';
    payBtn.disabled = true;
    payBtn.textContent = 'Pay now';
    return;
  }

  lines.forEach(function (l, i) {
    // Visible summary
    var li = document.createElement('li');
    var nameSpan = document.createElement('span');
    nameSpan.className = 'ck-item-name';
    nameSpan.textContent = l.product.shortName || l.product.name;
    if (l.addons.length) {
      var addonSpan = document.createElement('span');
      addonSpan.className = 'ck-item-addons';
      addonSpan.textContent = l.addons.map(function (a) { return a.name; }).join(', ');
      nameSpan.appendChild(addonSpan);
    }
    var priceSpan = document.createElement('span');
    priceSpan.className = 'ck-item-price';
    priceSpan.textContent = '$' + l.total;
    li.appendChild(nameSpan);
    li.appendChild(priceSpan);
    itemsList.appendChild(li);

    // Hidden form fields
    var idInput = document.createElement('input');
    idInput.type = 'hidden';
    idInput.name = 'items[' + i + '][id]';
    idInput.value = l.id;
    hiddenContainer.appendChild(idInput);

    l.addons.forEach(function (a) {
      var aInput = document.createElement('input');
      aInput.type = 'hidden';
      aInput.name = 'items[' + i + '][addons][]';
      aInput.value = a.id;
      hiddenContainer.appendChild(aInput);
    });
  });

  var total = cartTotal();
  totalEl.textContent = '$' + total;
  payBtn.disabled = false;
  payBtn.textContent = 'Pay $' + total + ' USD';
}

// Restore country selection after POST error
var savedCountry = <?php echo json_encode($billing['country'] ?? ''); ?>;
if (savedCountry && countrySelect) {
  countrySelect.value = savedCountry;
}

// Clear cart in localStorage right before form submits
form.addEventListener('submit', function () {
  clearCart();
});

main.style.display = '';
buildSummary();
</script>
</body>
</html>
