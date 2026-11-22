<?php
/**
 * Unlock attempt logger — proof-of-fulfillment evidence.
 * Appends one JSON line per unlock submission to .private_data/unlock_events.log.
 */
header('Content-Type: application/json');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'method not allowed']));
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) $data = [];

$key_raw = isset($data['key'])    ? (string)$data['key']    : '';
$result  = isset($data['result']) ? (string)$data['result'] : 'unknown';

if (!in_array($result, ['valid', 'invalid'], true)) $result = 'unknown';

// Normalise + size-limit
$key_clean = preg_replace('/[^A-Z0-9\-]/', '', strtoupper($key_raw));
if (strlen($key_clean) > 40) $key_clean = substr($key_clean, 0, 40);

$log_file = __DIR__ . '/../.private_data/unlock_events.log';
$log_dir  = dirname($log_file);
if (!is_dir($log_dir)) @mkdir($log_dir, 0755, true);

$record = [
    'timestamp'  => date('c'),
    'key'        => $key_clean,
    'result'     => $result,
    'ip'         => $_SERVER['REMOTE_ADDR']    ?? '',
    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? '',
    'referer'    => $_SERVER['HTTP_REFERER']    ?? '',
];

@file_put_contents($log_file, json_encode($record) . "\n", FILE_APPEND | LOCK_EX);

http_response_code(204);
exit;
