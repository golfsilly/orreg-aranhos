import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { imageFormat, MAX_PROFILE_IMAGE_BYTES, normalizeProfileImage, readLimitedBody } from "../lib/profile/image.ts";

test("normalizes avatars and signatures into bounded, metadata-free images", async () => {
  const original = await sharp({ create: { width: 1400, height: 700, channels: 4, background: "#438964" } }).png().toBuffer();
  assert.equal(imageFormat(original), "png");
  const avatar = await sharp(await normalizeProfileImage(original, "avatar")).metadata();
  const signature = await sharp(await normalizeProfileImage(original, "signature")).metadata();
  assert.equal(avatar.format, "webp");
  assert.deepEqual([avatar.width, avatar.height], [512, 512]);
  assert.equal(signature.format, "png");
  assert.deepEqual([signature.width, signature.height], [800, 400]);
  assert.equal(avatar.exif, undefined);
});

test("rejects unsupported, forged, damaged and oversized input", async () => {
  for (const image of [Buffer.from("<svg></svg>"), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(MAX_PROFILE_IMAGE_BYTES + 1)]) {
    await assert.rejects(normalizeProfileImage(image, "signature"));
  }
  await assert.rejects(readLimitedBody(new Request("http://localhost", { method: "PUT", headers: { "Content-Length": String(MAX_PROFILE_IMAGE_BYTES + 1) }, body: "x" })));
  await assert.rejects(readLimitedBody(new Request("http://localhost", { method: "PUT", body: new Uint8Array(MAX_PROFILE_IMAGE_BYTES + 1) })));
});
