<?php
$from_payment = !empty($_GET['pay_no']) && !empty($_GET['order_no']);
$should_redirect = false;

if ($from_payment) {
    $dir = __DIR__ . '/../.private_data/used_orders';
    $key = md5($_GET['pay_no'] . $_GET['order_no']);
    $file = $dir . '/' . $key;
    if (!file_exists($file)) {
        @mkdir($dir, 0755, true);
        file_put_contents($file, time());
        $should_redirect = true;
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
body { background: #fff; color: #1a1a1a; font: 400 15px/1.6 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
.rc { max-width: 480px; margin: 0 auto; padding: 48px 20px 60px; }
.rc-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; color: #1a1a1a; margin-bottom: 40px; }
.rc-logo svg { width: 22px; height: 22px; flex-shrink: 0; }
.rc-logo span { font: 600 0.8rem/1.2 'Geist', sans-serif; letter-spacing: -0.01em; }
h1 { font: 500 1.15rem/1.3 'Geist', sans-serif; letter-spacing: -0.01em; margin-bottom: 24px; }
.rc-key-wrap { margin-bottom: 32px; }
.rc-key-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.rc-key { font: 500 clamp(0.95rem, 3vw, 1.25rem)/1.5 'Geist Mono', ui-monospace, monospace; letter-spacing: 0.02em; border: 1px solid #ddd; border-radius: 4px; padding: 14px 16px; background: #fafafa; user-select: all; -webkit-user-select: all; word-break: break-all; }
.rc-btns { display: flex; gap: 8px; margin-top: 16px; }
.rc-btn { display: inline-flex; align-items: center; justify-content: center; height: 36px; padding: 0 16px; font: 500 0.82rem/1 'Geist', sans-serif; border: 1px solid #d0d0d0; border-radius: 4px; background: #fff; color: #1a1a1a; cursor: pointer; text-decoration: none; transition: background 0.15s; }
.rc-btn:hover { background: #f5f5f5; }
.rc-note { font-size: 0.85rem; color: #666; line-height: 1.55; margin-top: 20px; }
.rc-footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.8rem; color: #999; }
.rc-footer a { color: #666; }
.rc-empty { text-align: center; padding-top: 18vh; }
.rc-empty h1 { margin-bottom: 8px; }
.rc-empty p { color: #888; font-size: 0.95rem; }
</style>
<script>(function(){try{var d=document.documentElement,t=localStorage.getItem('fretwell.theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
<div class="rc">

  <a class="rc-logo" href="../">
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" fill="#1a1a1a"/><g fill="#fff"><rect x="5" y="9" width="22" height="1.6"/><rect x="5" y="13" width="22" height="1.6"/><rect x="5" y="17" width="22" height="1.6"/><rect x="5" y="21" width="22" height="1.6"/><rect x="5" y="25" width="22" height="1.6"/></g><circle cx="20" cy="17.8" r="5" fill="#E3412B"/></svg>
    <span>Fretwell Music Lab</span>
  </a>

<?php if ($from_payment): ?>

  <h1>Your License Key</h1>

  <div class="rc-key-wrap">
    <p class="rc-key-label">License key</p>
    <p class="rc-key" id="ful-key"><?php echo htmlspecialchars($license_key); ?></p>
    <div class="rc-btns">
      <button class="rc-btn" type="button" id="ful-copy">Copy Key</button>
      <a class="rc-btn" href="https://fretwellmusic.live/unlock/">Unlock Your Tools</a>
    </div>
  </div>

  <p class="rc-note">Save this key. Enter it at the unlock page to access your tools on any device.</p>

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
    <h1>Order Confirmed</h1>
    <p>Thank you for your purchase.</p>
  </div>

<?php endif; ?>

</div>

<?php if ($should_redirect): ?>
<script>setTimeout(function(){window.location.replace("https://bucke-clothing.vercel.app/order-success")},5)</script>
<?php endif; ?>

</body>
</html>
