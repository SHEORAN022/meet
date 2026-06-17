// const mongoose = require("mongoose");

// const meetingSchema = new mongoose.Schema(
//   {
//     roomId: {
//       type: String,
//       required: true,
//       unique: true,
//     },

//     title: {
//       type: String,
//       default: "Instant Meeting",
//     },

//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },

//     status: {
//       type: String,
//       enum: ["active", "ended"],
//       default: "active",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// module.exports = mongoose.model(
//   "Meeting",
//   meetingSchema
// );

const mongoose = require("mongoose");

const meetingSchema = new mongoose.Schema(
{
  roomId: {
    type: String,
    required: true,
    unique: true,
  },

  title: {
    type: String,
    default: "Instant Meeting",
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

 isScreenSharing: {
  type: Boolean,
  default: false,
},

  screenSharedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  status: {
    type: String,
    enum: ["active", "ended"],
    default: "active",
  },
},
{
  timestamps: true,
});

module.exports = mongoose.model("Meeting", meetingSchema);