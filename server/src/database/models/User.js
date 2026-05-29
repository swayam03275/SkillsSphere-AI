import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: false, // for Google users
    },

    role: {
      type: String,
      enum: ["student", "tutor", "recruiter"],
      default: "student",
    },

    provider: {
      type: String,
      default: "local", // local or google
    },

    profilePic: {
      type: String,
      default: null,
    },

    profilePicPublicId: {
      type: String,
      default: null,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationToken: { type: String, default: null },
    verificationTokenExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },

    otpAttempts: {
      type: Number,
      default: 0,
    },

    company: {
      type: String,
      default: null,
    },

    companyWebsite: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
