<?php
// Payment gateway credentials — read from environment variables.
// Set these in your hosting environment (e.g. Vercel environment variables).
// NEVER hardcode real credentials in this file.

$api_user    = getenv('ABPAYMENT_API_USER')    ?: '';
$private_key = getenv('ABPAYMENT_PRIVATE_KEY') ?: '';
$website     = 'fretwellmusic.live';
