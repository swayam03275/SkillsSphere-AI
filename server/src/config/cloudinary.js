import { v2 as cloudinary } from "cloudinary";
import AppError from "../utils/AppError.js";

const CLOUDINARY_FOLDER = "skillssphere/avatars";

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const configureCloudinary = () => {
  if (!hasCloudinaryConfig()) {
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return true;
};

export const uploadAvatarBuffer = (buffer, userId) => {
  if (!configureCloudinary()) {
    throw new AppError("Cloudinary avatar uploads are not configured", 500);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: `user-${userId}-${Date.now()}`,
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
};

export const deleteCloudinaryAsset = async (publicId) => {
  if (!publicId || !configureCloudinary()) {
    return false;
  }

  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });

  return true;
};
