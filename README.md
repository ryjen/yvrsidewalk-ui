# YVRSidewalk UI

This is the browser client for YVRSidewalk. The Zap page creates an incoming Lightning invoice through the separate ryjen/yvrsidewalk server.

## Invoice API configuration

Copy .env.example to .env.local for local development, or configure the REACT_APP_ build variables in your deployment environment **before building**.

- REACT_APP_ZAP_API_ORIGIN: HTTPS origin of the hardened server that provides POST /zap (no /zap suffix, path, query, username, or key). The example .invalid domain is deliberately non-functional.
- REACT_APP_MAX_INVOICE_SATS: maximum whole-satoshi amount; keep in sync with the server's MAX_INVOICE_SATS.

When the backend origin is missing, insecure, or invalid, the page disables invoice submission. Only on a local HTTP development page may the origin use http://localhost or a loopback address. There is no automatic fallback to the visitor's localhost.

The server must be configured with CORS_ALLOWED_ORIGINS containing **the actual deployed UI origin**. Do not use wildcard CORS. Browser CORS does not prevent direct non-browser requests; server-side validation, throttling, a least-privilege **invoice-only LNbits key**, and edge quotas are required.

The frontend never needs the LNbits API key. **Do not use a variable prefixed REACT_APP_ for credentials.** Historical LNbits/TLS credentials must be rotated separately before public deployment.

The main page's /queue integration currently uses another existing backend URL. This change affects only the Zap flow. Confirm the backend routing for both features before deployment.

## Validation

With Node.js 24 or later available:

    node --test test/zap-api.test.mjs

Tests use an injected fake fetcher and contact no wallet. A complete React build and live backend smoke test require a provisioned Node/npm toolchain and an independently secured backend.
