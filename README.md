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

## Read-only Polygon message history

The History page now calls `GET /history` on the same `REACT_APP_ZAP_API_ORIGIN` as the Zap endpoint. It does **not** call PolygonScan or Etherscan directly and must never contain an explorer API key. The backend is responsible for an Etherscan API V2 key with `chainid=137`, fixed recipient selection, caching, and upstream response validation. If the backend origin or history service is not configured, the UI shows an unavailable state rather than an endless spinner.

The older client-side PolygonScan V1 integration included an API key in public frontend code. Assess and revoke that key through the provider if it was active; removing code from a branch tip does not erase Git history or cached builds. Never set an API key in `REACT_APP_` configuration, which is publicly embedded in browser bundles.
