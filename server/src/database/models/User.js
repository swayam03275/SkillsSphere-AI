import mongoose from "mongoose";
import { encrypt, encryptDeterministic, decrypt } from "../../utils/encryption.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      get: decrypt,
      set: encrypt,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      get: decrypt,
      set: encryptDeterministic,
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

    proFeatures: {
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

    preferences: {
      notifications: {
        emailNotifications: { type: Boolean, default: true },
        interviewReminders: { type: Boolean, default: true },
        jobAlerts: { type: Boolean, default: true },
        applicationStatusUpdates: { type: Boolean, default: true },
        platformUpdates: { type: Boolean, default: false },
      },
      emailFrequency: {
        type: String,
        enum: ["instant", "daily", "weekly", "never"],
        default: "weekly",
      },
      privacy: {
        profileVisibility: {
          type: String,
          enum: ["public", "recruiters", "private"],
          default: "recruiters",
        },
        showResumeToRecruiters: { type: Boolean, default: true },
        showInterviewHistory: { type: Boolean, default: false },
        allowPersonalizedRecommendations: { type: Boolean, default: true },
      },
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Intercept queries on email to transparently encrypt them so exact matches still work
userSchema.pre(["find", "findOne", "countDocuments", "findOneAndUpdate", "updateOne"], function (next) {
  const query = this.getQuery();
  if (query && query.email) {
    if (typeof query.email === "string" && !query.email.startsWith("v1:cbc:")) {
      query.email = encryptDeterministic(query.email.toLowerCase().trim());
    } else if (query.email.$in && Array.isArray(query.email.$in)) {
      query.email.$in = query.email.$in.map(e => 
        (typeof e === "string" && !e.startsWith("v1:cbc:")) ? encryptDeterministic(e.toLowerCase().trim()) : e
      );
    }
  }
  next();
});

const User = mongoose.model("User", userSchema);
export default User;

