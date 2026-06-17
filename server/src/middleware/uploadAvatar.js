import multer from "multer";

const AVATAR_MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error("Only JPEG, PNG, or WebP images are allowed");
    err.code = "INVALID_FILE_TYPE";
    cb(err, false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: AVATAR_MAX_SIZE },
});

const isJpeg = (buf) =>
  buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

const isPng = (buf) =>
  buf.length >= 4 &&
  buf[0] === 0x89 &&
  buf[1] === 0x50 &&
  buf[2] === 0x4e &&
  buf[3] === 0x47;

const isWebp = (buf) =>
  buf.length >= 12 &&
  buf[0] === 0x52 &&
  buf[1] === 0x49 &&
  buf[2] === 0x46 &&
  buf[3] === 0x46 &&
  buf[8] === 0x57 &&
  buf[9] === 0x45 &&
  buf[10] === 0x42 &&
  buf[11] === 0x50;

const hasValidImageSignature = (buf) => isJpeg(buf) || isPng(buf) || isWebp(buf);

const parseAvatarUpload = (req, res, next) => {
  upload.single("avatar")(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ success: false, message: "Image must be 5MB or smaller" });
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

const validateAvatarSignature = (req, res, next) => {
  if (!req.file) return next();

  if (!hasValidImageSignature(req.file.buffer)) {
    return res.status(415).json({
      success: false,
      message: "The uploaded file is not a valid image. Please upload a genuine JPEG, PNG, or WebP file.",
    });
  }

  next();
};

export const uploadAvatarMiddleware = [parseAvatarUpload, validateAvatarSignature];
