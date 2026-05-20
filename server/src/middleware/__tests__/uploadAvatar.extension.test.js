import assert from "node:assert/strict";
import test from "node:test";

import { getAvatarExtension } from "../uploadAvatar.js";

test("getAvatarExtension maps accepted image MIME types to canonical extensions", () => {
  assert.equal(getAvatarExtension("image/jpeg"), ".jpg");
  assert.equal(getAvatarExtension("image/png"), ".png");
  assert.equal(getAvatarExtension("image/webp"), ".webp");
  assert.equal(getAvatarExtension("image/gif"), ".gif");
});

test("getAvatarExtension rejects unsupported or missing MIME types", () => {
  assert.equal(getAvatarExtension("image/svg+xml"), null);
  assert.equal(getAvatarExtension("application/octet-stream"), null);
  assert.equal(getAvatarExtension(undefined), null);
});
