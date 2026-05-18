import mongoose from "mongoose";

const classroomSessionSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: [true, "Room ID is required"],
      unique: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Session title is required"],
      trim: true,
      maxlength: [100, "Session title cannot exceed 100 characters"],
    },

    subject: {
      type: String,
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters"],
      default: "",
    },

    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Host reference is required"],
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
      index: true,
    },

    maxParticipants: {
      type: Number,
      default: 30,
      min: [2, "A session must allow at least 2 participants"],
      max: [100, "A session cannot exceed 100 participants"],
    },

    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const ClassroomSession = mongoose.model("ClassroomSession", classroomSessionSchema);
export default ClassroomSession;
