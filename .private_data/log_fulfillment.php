<?php
/**
 * Fulfillment logger for Stripe proof-of-fulfillment evidence.
 * One JSON file per order in .private_data/orders/.
 * Idempotent: skips if order already logged.
 *
 * On the live server .private_data/ is dot-prefixed so Nginx returns 403 on any
 * HTTP access. The orders/ subdir MUST be chmod 775 so www-data (the PHP process)
 * can write to it.
 */
function log_fulfillment_order($order_no, $pay_no, $license_key, $is_fretwell_direct) {
    if (empty($order_no)) return;

    $safe_order = preg_replace('/[^A-Za-z0-9_-]/', '', $order_no);
    if ($safe_order === '') return;

    $dir  = __DIR__ . '/orders';
    $file = $dir . '/' . $safe_order . '.json';

    if (file_exists($file)) return;  // idempotent

    @mkdir($dir, 0755, true);

    $record = [
        'order_no'     => $order_no,
        'pay_no'       => $pay_no,
        'license_key'  => $license_key,
        'source'       => $is_fretwell_direct ? 'fretwell_direct' : 'bucke_fretwell',
        'delivered_at' => date('c'),
        'ip'           => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent'   => $_SERVER['HTTP_USER_AGENT'] ?? '',
    ];

    @file_put_contents($file, json_encode($record, JSON_PRETTY_PRINT) . "\n", LOCK_EX);
}
