<?php
/**
 * Site A hosts allowed to use Fretwell as their Site B.
 *
 * Each entry is a bare host (no scheme, no path). Validators in
 * order-success/index.php and order-failed/index.php accept a
 * ?back=<url> query param only if its host matches here
 * (case-insensitive) AND its scheme is https.
 *
 * NOTE: Fretwell uses a BACKWARDS-COMPATIBLE HYBRID pattern:
 *   - If ?back=<url> is set AND host is in this allowlist → redirect to that URL
 *   - Otherwise → fall back to the hardcoded Bucke URL (preserves the
 *     pre-2026-11-22 Bucke → Fretwell flow)
 *
 * So this allowlist is OPT-IN for NEW Site As that want to use Fretwell
 * with ?back=. Bucke itself doesn't need to be in this allowlist until
 * Bucke's /api/payment/create is updated to pass ?back=<Bucke URL> — at
 * which point we can remove the hardcoded Bucke fallback and Fretwell
 * becomes fully generic like Tilecraft.
 *
 * To authorize a new Site A to use Fretwell:
 *   1. Append its host to the array below
 *   2. Ensure the Site A's Muadata call includes ?back=<its own URL>
 *      in order_success_uri and order_return_uri (URL-encoded)
 *
 * Example entries (uncomment when ready to authorize):
 *     'bucke-clothing.vercel.app',    // once Bucke passes ?back= too
 *     'newsitea.com',
 */

return [
    // intentionally empty — add Site A hosts here as they are authorized
];
