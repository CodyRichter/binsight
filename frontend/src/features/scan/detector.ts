import { BarcodeDetector, setZXingModuleOverrides } from "barcode-detector/ponyfill";
import decoderAddress from "zxing-wasm/reader/zxing_reader.wasm?url";

// The decoder is served with the app, never from the library's default CDN (decision 0017).
setZXingModuleOverrides({
  locateFile: (path: string, prefix: string) =>
    path.endsWith(".wasm") ? decoderAddress : prefix + path,
});

/** Finds the text of a QR code in a frame of video. */
export function qrDetector(): BarcodeDetector {
  return new BarcodeDetector({ formats: ["qr_code"] });
}
