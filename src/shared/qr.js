// ── Wi-Fi QR code ────────────────────────────────────────────────────────────
// The network as the WIFI: text phones read (the same as ha-wifi-card), drawn as an SVG by the QR engine of
// qr-code-engine.js, at the smallest version that holds it.
import { QRCodeModel, QRErrorCorrectLevel, QRRSBlock, QRUtil } from "./qr-code-engine.js";

// Escapes the characters reserved by the WIFI: format (backslash, ; , : and ").
export const gsQrField = (s) => String(s).replace(/([\\;,:"])/g, "\\$1");

// `security`: WPA (WPA, WPA2 and WPA3 alike), WEP or nopass; H:true tells the phone the network does not broadcast
// its SSID, so it joins it anyway.
export const gsQrString = ({ ssid, password, security, hidden }) => {
  const open = security === "nopass";
  return `WIFI:T:${open ? "nopass" : security === "WEP" ? "WEP" : "WPA"};S:${gsQrField(ssid)};P:${open ? "" : gsQrField(password ?? "")};${hidden ? "H:true;" : ""};`;
};

// The smallest QR version (error correction M) that holds `bytes` bytes.
export const gsQrMinVersion = (bytes) => {
  for (let t = 1; t <= 40; t++) {
    const capacity = QRRSBlock.getRSBlocks(t, QRErrorCorrectLevel.M).reduce((n, b) => n + b.dataCount, 0);
    // 4 mode bits + the version-dependent length field, then the payload itself.
    if (4 + QRUtil.getLengthInBits(4, t) + bytes * 8 <= capacity * 8) return t;
  }
  return 40;
};

// The QR code of `text` as an SVG of `size` px: dark modules on a white square, with the quiet zone of 4 modules the
// QR spec asks for. `label`: its accessible name.
export const gsQrSvg = (text, size, label) => {
  // UTF-8 byte length, exactly as the engine counts it.
  const bytes = unescape(encodeURIComponent(text)).length;
  let qr = null;
  for (let t = gsQrMinVersion(bytes); t <= 40 && !qr; t++) {
    try {
      const q = new QRCodeModel(t, QRErrorCorrectLevel.M);
      q.addData(text);
      q.make();
      qr = q;
    } catch (e) {
      // Too small for the payload: try the next version; anything else is a bug.
      if (!/code length overflow/.test(e?.message)) throw e;
    }
  }
  if (!qr) return "";
  const n = qr.getModuleCount();
  const dim = n + 8;
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="${label}"><rect width="${dim}" height="${dim}" fill="#fff"/><path fill="#1f2328" d="${d}"/></svg>`;
};
