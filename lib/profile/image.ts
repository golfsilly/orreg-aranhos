import sharp from "sharp";

export const MAX_PROFILE_IMAGE_BYTES = 3 * 1024 * 1024;
export type ProfileAssetKind = "avatar" | "signature";

/** Never trust a file name or supplied MIME type; reject SVG and other formats. */
export function imageFormat(data: Uint8Array): "png" | "jpeg" | "webp" | null {
  const b = Buffer.from(data);
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

/** Decode, limit dimensions and re-encode to discard metadata and unsafe payloads. */
export async function normalizeProfileImage(data: Uint8Array, kind: ProfileAssetKind): Promise<Buffer> {
  if (!data.byteLength || data.byteLength > MAX_PROFILE_IMAGE_BYTES || !imageFormat(data)) throw new Error("Invalid image");
  const pipeline = sharp(Buffer.from(data), { limitInputPixels: 16_000_000, failOn: "warning", animated: false }).rotate();
  const info = await pipeline.metadata();
  if (!info.width || !info.height || !["png", "jpeg", "webp"].includes(info.format ?? "")) throw new Error("Invalid image");
  if (kind === "avatar") return pipeline.resize(512, 512, { fit: "cover", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  return pipeline.resize(1200, 400, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
}

export async function readLimitedBody(request: Request): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_PROFILE_IMAGE_BYTES)) throw new Error("Image too large");
  if (!request.body) throw new Error("Missing image");
  const reader = request.body.getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PROFILE_IMAGE_BYTES) { await reader.cancel(); throw new Error("Image too large"); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(parts);
}
