// models/ScheduledMeeting.js
const mongoose = require("mongoose");

const scheduledMeetingSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
    },

    topic: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    scheduledDate: {
      type: Date,
      required: true,
    },

    duration: {
      type: Number, // minutes mein
      default: 30,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    waitingRoom: {
      type: Boolean,
      default: true,
    },

    // Jab actual meeting start ho jaaye to Meeting model se link ho jayega
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
    },

    status: {
      type: String,
      enum: ["upcoming", "started", "ended", "cancelled"],
      default: "upcoming",
    },

    // Invited participants (optional)
    invitedEmails: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ScheduledMeeting", scheduledMeetingSchema);