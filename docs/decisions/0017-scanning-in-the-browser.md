# 0017: The in-app scanner reads QR codes with the BarcodeDetector ponyfill

Status: Accepted

## Context

Scan-to-move and `/scan` read a label's QR code from the camera inside the
app (requirements). Chrome on Android has the browser's own
`BarcodeDetector`; Safari on iPhone does not, so a decoder has to ship with
the app. Labels are only ever opened in the browser, never a native app.

## Decision

- The scanner uses the standard `BarcodeDetector` API through the
  `barcode-detector` ponyfill, which decodes with zxing-wasm. Both are
  pinned exactly in `frontend/package.json`.
- The decoder's wasm file is bundled by Vite and served from the app's own
  origin. The library's default of loading it from a CDN is overridden, so
  scanning works on a home network with no internet and sends nothing out.
- The decoder loads only when a scanner opens, so other pages do not pay
  for its size (about 1 MB).
- The page policy allows WebAssembly with `'wasm-unsafe-eval'` in
  `script-src`. Scripts are still only the app's own.
- A scanned code counts only when the QR holds an address whose path is
  `/l/{code}`, on any host, so a label printed while the install had
  another address still names its location; the app only ever navigates
  within itself.

## Rejected

- jsQR: pure JavaScript and small, but unmaintained since 2020.
- qr-scanner: brings its own video handling and has had no release since
  2023.
- The browser's own `BarcodeDetector` alone: absent on iPhone.

## Cost

- The camera needs a secure address: HTTPS, or `localhost`. Over plain
  HTTP on another host the scanner says how to allow the camera and the
  code can be typed instead.
- `'wasm-unsafe-eval'` widens the page policy slightly.
