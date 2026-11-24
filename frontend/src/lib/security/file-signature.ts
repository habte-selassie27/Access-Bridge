/**
 * File signature (magic-byte) validation (WP-024).
 *
 * MIME labels and extensions are user-controlled; the actual bytes are not.
 * We sniff the header so a renamed executable or mismatched image is rejected
 * before it is processed or uploaded.
 */
export async function hasValidSignature(file: File): Promise<boolean> {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const type = file.type;

  if (type === "text/plain") return true; // no magic bytes; size/MIME already checked

  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
  }
  if (type === "image/png" || file.name.toLowerCase().endsWith(".png")) {
    return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  }
  if (type === "image/jpeg" || /\.(jpe?g)$/.test(file.name.toLowerCase())) {
    return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  }
  if (type === "image/webp" || file.name.toLowerCase().endsWith(".webp")) {
    const riff = String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) === "RIFF";
    const webp = String.fromCharCode(buf[8], buf[9], buf[10], buf[11]) === "WEBP";
    return riff && webp;
  }
  return false;
}