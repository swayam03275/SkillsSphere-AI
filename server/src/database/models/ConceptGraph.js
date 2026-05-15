import mongoose from "mongoose";

const conceptNodeSchema = new mongoose.Schema(
  {
    conceptId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    parent: {
      type: String,
      default: null,
    },

    children: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const conceptGraphSchema = new mongoose.Schema(
  {
    topic: {
      type: String,
      required: [true, "Topic is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    concepts: {
      type: [conceptNodeSchema],
      default: [],
      validate: {
        validator: (val) => Array.isArray(val) && val.length > 0,
        message: "At least one concept is required",
      },
    },
  },
  { timestamps: true }
);

const ConceptGraph = mongoose.model("ConceptGraph", conceptGraphSchema);
export default ConceptGraph;
