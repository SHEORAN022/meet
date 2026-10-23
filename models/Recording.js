const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    part: { type: Number, default: 1 }, // pause/resume par recording kai parts me hoti hai
    fileName: String,
    bunnyPath: String,
    url: String, // Bunny CDN link
    size: Number, // bytes
    duration: Number, // seconds
  },
  { _id: false }
);

const recordingSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      index: true,
    },

    roomId: { type: String, required: true, index: true },

    startedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // recording  = chal rahi hai
    // paused     = pause hai
    // processing = stop ho gayi, file upload hona baaki hai
    // uploaded   = Bunny par save ho gayi
    // failed     = upload fail hua
    status: {
      type: String,
      enum: ["recording", "paused", "processing", "uploaded", "failed"],
      default: "recording",
    },

    startedAt: { type: Date, default: Date.now },
    stoppedAt: { type: Date, default: null },

    files: [fileSchema],

    error: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recording", recordingSchema);