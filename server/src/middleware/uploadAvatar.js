import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDirectory = path.join(process.cwd(), "src", "uploads", "avatars");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (req, file, cb) => {
    const extMap = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const extension = extMap[file.mimetype] || path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `avatar-${req.user._id}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error("Only JPEG, PNG, WebP, or GIF images are allowed");
    err.code = "INVALID_FILE_TYPE";
    cb(err, false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3 MB
});

export const uploadAvatarMiddleware = (req, res, next) => {
  upload.single("avatar")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "Image must be under 3 MB" });
      }
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error?.code === "INVALID_FILE_TYPE") {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error) {
      return res.status(500).json({ success: false, message: "Failed to upload image" });
    }
    next();
  });
};
