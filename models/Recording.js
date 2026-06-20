// models/Recording.js
const mongoose = require("mongoose");

const recordingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
    },

    roomId: {
      type: String,
      required: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileName: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
      default: 0,
    },

    mimeType: {
      type: String,
      default: "video/webm",
    },

    cdnUrl: {
      type: String,
      default: "", // ✅ required nahi — pehle empty rahega
    },

    bunnyPath: {
      type: String,
      default: "", // ✅ required nahi — pehle empty rahega
    },

    status: {
      type: String,
      enum: ["uploading", "ready", "failed", "deleted"],
      default: "uploading",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Recording", recordingSchema);