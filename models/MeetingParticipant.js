// const mongoose = require("mongoose");

// const meetingParticipantSchema = new mongoose.Schema(
//   {
//     meetingId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Meeting",
//       required: true,
//     },

//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     joinedAt: {
//       type: Date,
//       default: Date.now,
//     },

//     leftAt: {
//       type: Date,
//       default: null,
//     },

//     duration: {
//       type: Number,
//       default: 0,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model(
//   "MeetingParticipant",
//   meetingParticipantSchema
// );

const mongoose = require("mongoose");

const meetingParticipantSchema = new mongoose.Schema(
{
  meetingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Meeting",
    required: true,
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  //   status: {
  //   type: String,
  //   enum: ["waiting", "approved", "rejected"],
  //   default: "waiting",
  // },

  status: {
  type: String,
  enum: [
    "waiting",
    "approved",
    "rejected",
    "removed"
  ],
  default: "waiting",
},
  isMuted: {
    type: Boolean,
    default: false,
  },

  isRemoved: {
    type: Boolean,
    default: false,
  },
    raisedHand: {
  type: Boolean,
  default: false,
},
  joinedAt: {
    type: Date,
    default: Date.now,
  },

  leftAt: {
    type: Date,
    default: null,
  },

  duration: {
    type: Number,
    default: 0,
  },
},
{
  timestamps: true,
});

module.exports = mongoose.model(
  "MeetingParticipant",
  meetingParticipantSchema
);