import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import fs from "node:fs/promises";
import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import User from "../../../database/models/User.js";
import { removeAvatar, uploadAvatar } from "../controller.js";

const invokeController = (controller, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode: this.statusCode, data });
      },
    };

    controller(req, res, reject);
  });

afterEach(() => {
  mock.restoreAll();
  delete process.env.CLOUDINARY_CLOUD_NAME;
  delete process.env.CLOUDINARY_API_KEY;
  delete process.env.CLOUDINARY_API_SECRET;
});

test("uploadAvatar - uploads to Cloudinary, stores URL and public ID, and deletes old Cloudinary avatar", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";

  const userId = "user-123";
  const oldPublicId = "skillssphere/avatars/old-avatar";
  const uploaded = {
    secure_url: "https://res.cloudinary.com/demo/image/upload/v1/new-avatar.png",
    public_id: "skillssphere/avatars/new-avatar",
  };
  let updatePayload;
  const destroyedIds = [];

  mock.method(User, "findById", async () => ({
    _id: userId,
    profilePic: "https://res.cloudinary.com/demo/image/upload/v1/old-avatar.png",
    profilePicPublicId: oldPublicId,
  }));
  mock.method(User, "findByIdAndUpdate", (_id, update) => {
    updatePayload = update;
    return {
      select: async () => ({ _id, ...update, email: "a@example.com" }),
    };
  });
  mock.method(cloudinary.uploader, "upload_stream", (_options, callback) => ({
    end(buffer) {
      assert.equal(buffer.toString(), "avatar-bytes");
      callback(null, uploaded);
    },
  }));
  mock.method(cloudinary.uploader, "destroy", async (publicId) => {
    destroyedIds.push(publicId);
    return { result: "ok" };
  });

  const tempAvatarPath = path.join(
    process.cwd(),
    "src",
    "uploads",
    "avatars",
    `__test-avatar-${Date.now()}.png`
  );
  await fs.mkdir(path.dirname(tempAvatarPath), { recursive: true });
  await fs.writeFile(tempAvatarPath, Buffer.from("avatar-bytes"));

  const response = await invokeController(uploadAvatar, {
    user: { _id: userId },
    file: { path: tempAvatarPath },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.success, true);
  assert.deepEqual(updatePayload, {
    profilePic: uploaded.secure_url,
    profilePicPublicId: uploaded.public_id,
  });
  assert.equal(response.data.user.profilePic, uploaded.secure_url);
  assert.equal(response.data.user.profilePicPublicId, uploaded.public_id);
  assert.deepEqual(destroyedIds, [oldPublicId]);
  await assert.rejects(fs.access(tempAvatarPath));
});

test("removeAvatar - clears user avatar fields and deletes Cloudinary image by public ID", async () => {
  process.env.CLOUDINARY_CLOUD_NAME = "demo";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";

  const publicId = "skillssphere/avatars/remove-me";
  const destroyedIds = [];
  const user = {
    _id: "user-123",
    name: "Aarav Sharma",
    profilePic: "https://res.cloudinary.com/demo/image/upload/v1/remove-me.png",
    profilePicPublicId: publicId,
    async save() {},
    toObject() {
      return {
        _id: this._id,
        name: this.name,
        profilePic: this.profilePic,
        profilePicPublicId: this.profilePicPublicId,
      };
    },
  };

  mock.method(User, "findById", async () => user);
  mock.method(cloudinary.uploader, "destroy", async (destroyedPublicId) => {
    destroyedIds.push(destroyedPublicId);
    return { result: "ok" };
  });

  const response = await invokeController(removeAvatar, {
    user: { _id: user._id },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.success, true);
  assert.equal(user.profilePic, null);
  assert.equal(user.profilePicPublicId, null);
  assert.equal(response.data.user.profilePic, null);
  assert.equal(response.data.user.profilePicPublicId, null);
  assert.deepEqual(destroyedIds, [publicId]);
});
