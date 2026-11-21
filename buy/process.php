<?php
// Fretwell Music Lab — checkout payment processor
// Called by checkout.js when a payment button is clicked.
// Posts to Muadata server-to-server, returns linkform URL as JSON.

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require __DIR__ . '/.credentials.php';
require __DIR__ . '/products.php';

// Read JSON body from checkout JS
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['items']) || !is_array($input['items'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}

$pay = (isset($input['pay']) && $input['pay'] === 'paypal') ? 'paypal' : 'nolimit';

// Validate items and calculate total from server-side prices
$order_product = [];
$order_total = 0;

foreach ($input['items'] as $item) {
    $id = isset($item['id']) ? trim($item['id']) : '';
    $product = lookup_product($id);
    if (!$product) {
        http_response_code(400);
        echo json_encode(['error' => 'Unknown product']);
        exit;
    }

    $addons = [];
    if (isset($item['addons']) && is_array($item['addons'])) {
        $valid_addons = ['planner', 'guide', 'bonus', 'export'];
        foreach ($item['addons'] as $a) {
            $a = trim($a);
            if (in_array($a, $valid_addons, true) && isset($product['addons'][$a])) {
                $addons[] = $a;
            }
        }
    }

    $line_total = calc_line_total($id, $addons);
    $order_total += $line_total;

    $name = $product['name'];
    if (!empty($addons)) $name .= ' (+' . implode(', ', $addons) . ')';

    $order_product[] = [
        'name' => $name,
        'model' => $id,
        'price' => number_format($line_total, 2, '.', ''),
        'quantity' => 1,
        'option' => [],
        'weight' => 0,
        'products_image' => '',
    ];
}

if (empty($order_product)) {
    http_response_code(400);
    echo json_encode(['error' => 'Cart is empty']);
    exit;
}

// Build Muadata request
$order_id = 'ORDER_' . str_replace('-', '_', bin2hex(random_bytes(16)));
$order_currency = 'USD';
$order_amount = number_format($order_total, 2, '.', '');

$sign = md5(MUADATA_API_USER . MUADATA_PRIVATE_KEY . $order_currency . $order_amount . $order_id);

$params = http_build_query([
    'order_id' => $order_id,
    'order_currency' => $order_currency,
    'order_amount' => $order_amount,
    'order_product' => json_encode($order_product),
    'pay' => $pay,
    'api_user' => MUADATA_API_USER,
    'website' => MUADATA_WEBSITE,
    'sign' => $sign,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0',
    'lan' => 'en-US',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Mozilla/5.0',
    'billing_first_name' => 'Customer',
    'billing_last_name' => 'Guest',
    'billing_email' => 'guest@fretwellmusic.live',
    'billing_phone' => '0000000000',
    'billing_address1' => '123 Main St',
    'billing_city' => 'New York',
    'billing_state' => 'NY',
    'billing_zip' => '10001',
    'billing_country' => 'US',
    'shipping_first_name' => 'Customer',
    'shipping_last_name' => 'Guest',
    'shipping_email' => 'guest@fretwellmusic.live',
    'shipping_phone' => '0000000000',
    'shipping_address1' => '123 Main St',
    'shipping_city' => 'New York',
    'shipping_state' => 'NY',
    'shipping_zip' => '10001',
    'shipping_country' => 'US',
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
    http_response_code(502);
    echo json_encode(['error' => 'Payment could not be processed. Please try again.']);
    exit;
}

// Parse response — may be JSON or URL-encoded
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
    echo json_encode(['url' => $linkform]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Payment could not be processed. Please try again.']);
}
