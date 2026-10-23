// const Meeting = require("../models/Meeting");
// const MeetingParticipant = require("../models/MeetingParticipant");

// const generateMeetingCode = () => {
//   const chars = "abcdefghijklmnopqrstuvwxyz";

//   const randomPart = (length) =>
//     Array.from({ length }, () =>
//       chars[Math.floor(Math.random() * chars.length)]
//     ).join("");

//   return `${randomPart(3)}-${randomPart(4)}-${randomPart(3)}`;
// };


// exports.createMeeting = async (req, res) => {
//   try {

//     let roomId;
//     let exists = true;

//     while (exists) {

//       roomId = generateMeetingCode();

//       const meetingExists = await Meeting.findOne({
//         roomId,
//       });

//       if (!meetingExists) {
//         exists = false;
//       }
//     }

//     const meeting = await Meeting.create({
//       roomId,
//       title: "Instant Meeting",
//       createdBy: req.user.id,
//       hostId: req.user.id,
//       status: "active",
//     });

//     res.status(201).json({
//       success: true,
//       message: "Meeting created successfully",

//       meeting: {
//         meetingId: meeting._id,
//         roomId: meeting.roomId,
//         title: meeting.title,
//         status: meeting.status,
//         hostId: meeting.hostId,
//         createdBy: meeting.createdBy,
//         createdAt: meeting.createdAt,
//       },

//       meetingLink: `meetapp://join/${meeting.roomId}`,

//       webLink: `https://meet.infyle.com/${meeting.roomId}`,
//     });

//   } catch (error) {

//     console.error("Create Meeting Error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };
// exports.getMeetingByRoomId = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       meeting,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // My Meetings
// exports.getMyMeetings = async (req, res) => {
//   try {

//     const meetings = await Meeting.find({
//       createdBy: req.user.id,
//     }).sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: meetings.length,
//       meetings,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };



// exports.endMeeting = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     // Sirf Host Meeting End Kar Sakta Hai
//     if (
//       meeting.hostId.toString() !== req.user.id
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host can end meeting",
//       });
//     }


//     if (meeting.status === "ended") {
//       return res.status(400).json({
//         success: false,
//         message: "Meeting already ended",
//       });
//     }

//     meeting.status = "ended";

//     await meeting.save();

//     res.status(200).json({
//       success: true,
//       message: "Meeting ended successfully",
//       roomId: meeting.roomId,
//       endedBy: req.user.id,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.joinMeeting = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     // Meeting Ended Check
//     if (meeting.status === "ended") {
//       return res.status(400).json({
//         success: false,
//         message: "Meeting has ended",
//       });
//     }
// const lastParticipant =
// await MeetingParticipant.findOne({
//   meetingId: meeting._id,
//   userId: req.user.id,
// })
// .sort({ createdAt: -1 });

// if (
//   lastParticipant &&
//   lastParticipant.status === "removed"
// ) {

//   const participant =
//   await MeetingParticipant.create({
//     meetingId: meeting._id,
//     userId: req.user.id,
//     joinedAt: new Date(),
//     isMuted: false,
//     status: "waiting",
//   });

//   return res.status(200).json({
//     success: true,
//     waitingApproval: true,
//     message: "Waiting for host approval",
//     roomId: meeting.roomId,
//     meetingId: meeting._id,
//     participantId: participant._id,
//   });
// }
//     // Removed User Check
//     // const removedUser =
//     //   await MeetingParticipant.findOne({
//     //     meetingId: meeting._id,
//     //     userId: req.user.id,
//     //     isRemoved: true,
//     //   });

//     // if (removedUser) {
//     //   return res.status(403).json({
//     //     success: false,
//     //     message: "You have been removed from this meeting",
//     //   });
//     // }

  
//     const alreadyJoined =
//       await MeetingParticipant.findOne({
//         meetingId: meeting._id,
//         userId: req.user.id,
//         leftAt: null,
//       });

//     if (alreadyJoined) {
//       return res.status(400).json({
//         success: false,
//         message: "Already joined this meeting",
//       });
//     }

//     // Create Participant
//     const participant =
//       await MeetingParticipant.create({
//         meetingId: meeting._id,
//         userId: req.user.id,
//         joinedAt: new Date(),

//         isMuted: false,
//         isRemoved: false,

//         status: meeting.waitingRoom
//           ? "waiting"
//           : "approved",
//       });

//     // Waiting Room Enabled
//     if (
//       meeting.waitingRoom &&
//       participant.status === "waiting"
//     ) {
//       return res.status(200).json({
//         success: true,
//         waitingApproval: true,
//         message:
//           "Waiting for host approval",
//         roomId: meeting.roomId,
//         meetingId: meeting._id,
//         participantId: participant._id,
//       });
//     }

//     // Direct Join
//     res.status(200).json({
//       success: true,
//       waitingApproval: false,
//       message: "Joined meeting successfully",

//       roomId: meeting.roomId,
//       meetingId: meeting._id,
//       participantId: participant._id,

//       isHost:
//         meeting.hostId.toString() ===
//         req.user.id,

//       meeting,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };
// exports.shareMeeting = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       roomId: meeting.roomId,
//       meetingLink: `https://meet.infyle.com/${meeting.roomId}`,
//       shareText: `Join my meeting

// Meeting Code: ${meeting.roomId}

// Link: https://meet.infyle.com/${meeting.roomId}`,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getMeetingHistory = async (req, res) => {
//   try {

//     const meetings = await Meeting.find({
//       createdBy: req.user.id,
//     })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       success: true,
//       totalMeetings: meetings.length,
//       meetings,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.getActiveMeetings = async (req, res) => {
//   try {

//     const meetings = await Meeting.find({
//       status: "active",
//       createdBy: req.user.id,
//     });

//     res.status(200).json({
//       success: true,
//       meetings,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.leaveMeeting = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     const meeting = await Meeting.findOne({
//       roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     const participant =
//       await MeetingParticipant.findOne({
//         meetingId: meeting._id,
//         userId: req.user.id,
//         leftAt: null,
//       });

//     if (!participant) {
//       return res.status(404).json({
//         success: false,
//         message: "Participant not found",
//       });
//     }

//     participant.leftAt = new Date();

//     participant.duration = Math.floor(
//       (participant.leftAt - participant.joinedAt) / 1000
//     );

//     await participant.save();

//     res.status(200).json({
//       success: true,
//       duration: participant.duration,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.getMeetingParticipants = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     const participants =
//       await MeetingParticipant.find({
//         meetingId: meeting._id,
//       })
//       .populate("userId", "name email phone")
//       .sort({ joinedAt: -1 });

//     res.status(200).json({
//       success: true,
//       participants,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };


// exports.getJoinedMeetingsHistory = async (req, res) => {
//   try {

//     const joinedMeetings = await MeetingParticipant.find({
//       userId: req.user.id,
//     })
//       .populate({
//         path: "meetingId",
//         select: "roomId title status createdAt",
//       })
//       .sort({ joinedAt: -1 });

//     res.status(200).json({
//       success: true,
//       totalMeetings: joinedMeetings.length,
//       meetings: joinedMeetings,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.getMeetingInfo = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     }).populate("hostId", "name email");

//     const participantCount =
//       await MeetingParticipant.countDocuments({
//         meetingId: meeting._id,
//         leftAt: null,
//       });

//     res.json({
//       success: true,
//       meeting,
//       participantCount,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.muteUser = async (req, res) => {
//   try {

//     const { roomId, userId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     if (meeting.hostId.toString() !== req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host can mute users",
//       });
//     }

//     await MeetingParticipant.findOneAndUpdate(
//       {
//         meetingId: meeting._id,
//         userId,
//         leftAt: null,
//       },
//       {
//         isMuted: true,
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "User muted successfully",
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.muteAll = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     if (meeting.hostId.toString() !== req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host can mute all users",
//       });
//     }

//     await MeetingParticipant.updateMany(
//       {
//         meetingId: meeting._id,
//         leftAt: null,
//       },
//       {
//         isMuted: true,
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "All participants muted",
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// // exports.removeUser = async (req, res) => {
// //   try {

// //     const { roomId, userId } = req.body;

// //     const meeting = await Meeting.findOne({ roomId });

// //     if (!meeting) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "Meeting not found",
// //       });
// //     }

// //     if (meeting.hostId.toString() !== req.user.id) {
// //       return res.status(403).json({
// //         success: false,
// //         message: "Only host can remove users",
// //       });
// //     }

// //     await MeetingParticipant.findOneAndUpdate(
// //       {
// //         meetingId: meeting._id,
// //         userId,
// //         leftAt: null,
// //       },
// //       {
// //         isRemoved: true,
// //         leftAt: new Date(),
// //       }
// //     );

// //     res.status(200).json({
// //       success: true,
// //       message: "User removed successfully",
// //     });

// //   } catch (error) {

// //     res.status(500).json({
// //       success: false,
// //       message: error.message,
// //     });

// //   }
// // };
// exports.removeUser = async (req, res) => {
//   try {

//     const { roomId, userId } = req.body;

//     if (!roomId || !userId) {
//       return res.status(400).json({
//         success: false,
//         message: "roomId and userId are required",
//       });
//     }

//     const meeting = await Meeting.findOne({
//       roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     // Only Host Can Remove
//     if (
//       meeting.hostId.toString() !== req.user.id
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host can remove users",
//       });
//     }

//     // Host ko remove nahi kar sakte
//     if (
//       meeting.hostId.toString() === userId
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Host cannot remove himself",
//       });
//     }

//     const participant =
//       await MeetingParticipant.findOne({
//         meetingId: meeting._id,
//         userId,
//         leftAt: null,
//       });

//     if (!participant) {
//       return res.status(404).json({
//         success: false,
//         message: "Participant not found",
//       });
//     }

//     participant.status = "removed";
//     participant.leftAt = new Date();

//     await participant.save();

//     res.status(200).json({
//       success: true,
//       message: "User removed successfully",
//       roomId,
//       userId,
//       removedAt: participant.leftAt,
//     });

//   } catch (error) {

//     console.log(
//       "REMOVE USER ERROR:",
//       error
//     );

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };
// exports.removeAll = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     if (meeting.hostId.toString() !== req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host can remove all users",
//       });
//     }

//     await MeetingParticipant.updateMany(
//       {
//         meetingId: meeting._id,
//         leftAt: null,
//       },
//       {
//         isRemoved: true,
//         leftAt: new Date(),
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "All participants removed",
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.unmuteUser = async (req, res) => {
//   try {

//     const { roomId, userId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     if (meeting.hostId.toString() !== req.user.id) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host allowed",
//       });
//     }

//     await MeetingParticipant.findOneAndUpdate(
//       {
//         meetingId: meeting._id,
//         userId,
//         leftAt: null,
//       },
//       {
//         isMuted: false,
//       }
//     );

//     res.json({
//       success: true,
//       message: "User unmuted",
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// exports.unmuteAll = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     await MeetingParticipant.updateMany(
//       {
//         meetingId: meeting._id,
//         leftAt: null,
//       },
//       {
//         isMuted: false,
//       }
//     );

//     res.json({
//       success: true,
//       message: "All users unmuted",
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// // exports.transferHost = async (req, res) => {
// //   try {

// //     const { roomId, newHostId } = req.body;

// //     const meeting = await Meeting.findOne({
// //       roomId,
// //     });

// //     if (!meeting) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "Meeting not found",
// //       });
// //     }

// //     // Current Host Check
// //     if (
// //       meeting.hostId.toString() !==
// //       req.user.id
// //     ) {
// //       return res.status(403).json({
// //         success: false,
// //         message: "Only current host can transfer host rights",
// //       });
// //     }

// //     // Check Participant Exists
// //     const participant =
// //       await MeetingParticipant.findOne({
// //         meetingId: meeting._id,
// //         userId: newHostId,
// //         leftAt: null,
// //       });

// //     if (!participant) {
// //       return res.status(404).json({
// //         success: false,
// //         message: "Selected user is not in meeting",
// //       });
// //     }

// //     // Transfer Host
// //     meeting.hostId = newHostId;

// //     await meeting.save();

// //     res.status(200).json({
// //       success: true,
// //       message: "Host transferred successfully",
// //       roomId: meeting.roomId,
// //       newHostId,
// //     });

// //   } catch (error) {

// //     res.status(500).json({
// //       success: false,
// //       message: error.message,
// //     });

// //   }
// // };
// exports.transferHost = async (req, res) => {
//   try {

//     const { roomId, newHostId } = req.body;

//     // Validation
//     if (!roomId || !newHostId) {
//       return res.status(400).json({
//         success: false,
//         message: "roomId and newHostId are required",
//       });
//     }

//     const meeting = await Meeting.findOne({
//       roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     // Meeting Ended Check
//     if (meeting.status === "ended") {
//       return res.status(400).json({
//         success: false,
//         message: "Meeting has ended",
//       });
//     }

//     // Current Host Check
//     if (
//       meeting.hostId.toString() !== req.user.id
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Only current host can transfer host rights",
//       });
//     }

//     // Same User Check
//     if (
//       meeting.hostId.toString() === newHostId
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "User is already host",
//       });
//     }

//     // Participant Check
//     const participant =
//       await MeetingParticipant.findOne({
//         meetingId: meeting._id,
//         userId: newHostId,
//         leftAt: null,
//         isRemoved: false,
//         status: "approved",
//       }).populate(
//         "userId",
//         "name email phone"
//       );

//     if (!participant) {
//       return res.status(404).json({
//         success: false,
//         message: "Selected user is not an active participant",
//       });
//     }

//     const oldHostId =
//       meeting.hostId.toString();

//     // Transfer Host
//     meeting.hostId = newHostId;

//     await meeting.save();

//     res.status(200).json({
//       success: true,
//       message: "Host transferred successfully",
//       roomId: meeting.roomId,
//       oldHostId,
//       newHostId,
//       newHost: participant.userId,
//     });

//   } catch (error) {

//     console.log(
//       "TRANSFER HOST ERROR:",
//       error
//     );

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.getWaitingParticipants = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     const participants =
//       await MeetingParticipant.find({
//         meetingId: meeting._id,
//         status: "waiting",
//       }).populate(
//         "userId",
//         "name email phone"
//       );

//     res.status(200).json({
//       success: true,
//       participants,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// exports.admitUser = async (req, res) => {
//   try {

//     const { roomId, userId } = req.body;

//     const meeting = await Meeting.findOne({
//       roomId,
//     });

//     await MeetingParticipant.findOneAndUpdate(
//       {
//         meetingId: meeting._id,
//         userId,
//       },
//       {
//         status: "approved",
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "User admitted",
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// exports.rejectUser = async (req, res) => {
//   try {

//     const { roomId, userId } = req.body;

//     const meeting = await Meeting.findOne({
//       roomId,
//     });

//     await MeetingParticipant.findOneAndUpdate(
//       {
//         meetingId: meeting._id,
//         userId,
//       },
//       {
//         status: "rejected",
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "User rejected",
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// exports.startScreenShare = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     const meeting = await Meeting.findOne({ roomId });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     if (meeting.status === "ended") {
//       return res.status(400).json({
//         success: false,
//         message: "Meeting has ended",
//       });
//     }

//     // Ek time par sirf ek user share kare
//     if (meeting.isScreenSharing) {
//       return res.status(400).json({
//         success: false,
//         message: "Someone is already sharing screen",
//       });
//     }

//     meeting.isScreenSharing = true;
//     meeting.screenSharedBy = req.user.id;

//     await meeting.save();

//     res.status(200).json({
//       success: true,
//       message: "Screen sharing started",
//       roomId,
//       sharedBy: req.user.id,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.stopScreenShare = async (req, res) => {
//   try {

//     const { roomId } = req.body;

//     if (!roomId) {
//       return res.status(400).json({
//         success: false,
//         message: "Room ID is required",
//       });
//     }

//     const meeting = await Meeting.findOne({ roomId });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     if (meeting.status === "ended") {
//       return res.status(400).json({
//         success: false,
//         message: "Meeting has ended",
//       });
//     }

//     if (!meeting.isScreenSharing) {
//       return res.status(400).json({
//         success: false,
//         message: "No screen is being shared",
//       });
//     }

//     const hostId = meeting.hostId?.toString();

//     const screenSharerId =
//       meeting.screenSharedBy?._id
//         ? meeting.screenSharedBy._id.toString()
//         : meeting.screenSharedBy?.toString();

//     // Sirf Host ya Current Sharer Stop Kar Sakta Hai
//     if (
//       hostId !== req.user.id &&
//       screenSharerId !== req.user.id
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Only host or current sharer can stop screen sharing",
//       });
//     }

//     meeting.isScreenSharing = false;
//     meeting.screenSharedBy = null;

//     await meeting.save();

//     res.status(200).json({
//       success: true,
//       message: "Screen sharing stopped successfully",
//       roomId: meeting.roomId,
//       stoppedBy: req.user.id,
//     });

//   } catch (error) {

//     console.log("STOP SCREEN SHARE ERROR:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };
// exports.getScreenShareStatus = async (req, res) => {
//   try {

//     const meeting = await Meeting.findOne({
//       roomId: req.params.roomId,
//     }).populate(
//       "screenSharedBy",
//       "name email"
//     );

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     res.status(200).json({
//       success: true,
//       isScreenSharing: meeting.isScreenSharing,
//       screenSharedBy: meeting.screenSharedBy,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

// exports.getAdminStats = async (req, res) => {
//   try {
//     const [totalMeetings, activeMeetings, endedMeetings] =
//       await Promise.all([
//         Meeting.countDocuments(),
//         Meeting.countDocuments({ status: "active" }),
//         Meeting.countDocuments({ status: "ended" }),
//       ]);

//     // Abhi chal rahi meetings
//     const liveMeetings = await Meeting.find({ status: "active" })
//       .populate("hostId", "name email")
//       .sort({ createdAt: -1 });

//     const liveIds = liveMeetings.map((m) => m._id);

//     // Har live meeting me kitne users abhi andar hain
//     const counts = await MeetingParticipant.aggregate([
//       {
//         $match: {
//           meetingId: { $in: liveIds },
//           leftAt: null,
//           status: "approved",
//         },
//       },
//       { $group: { _id: "$meetingId", count: { $sum: 1 } } },
//     ]);

//     const countMap = {};
//     counts.forEach((c) => (countMap[c._id.toString()] = c.count));

//     const live = liveMeetings.map((m) => ({
//       meetingId: m._id,
//       roomId: m.roomId,
//       title: m.title,
//       host: m.hostId,
//       participants: countMap[m._id.toString()] || 0,
//       isScreenSharing: m.isScreenSharing,
//       startedAt: m.createdAt,
//     }));

//     const usersInMeetings = live.reduce((s, m) => s + m.participants, 0);

//     const waitingUsers = await MeetingParticipant.countDocuments({
//       meetingId: { $in: liveIds },
//       leftAt: null,
//       status: "waiting",
//     });

//     const uniqueUsers = (
//       await MeetingParticipant.distinct("userId")
//     ).length;

//     res.status(200).json({
//       success: true,
//       stats: {
//         totalMeetings,
//         activeMeetings,
//         endedMeetings,
//         usersInMeetings,
//         waitingUsers,
//         uniqueUsers,
//       },
//       liveMeetings: live,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };
// // Admin: saari meetings + users count
// exports.getAdminMeetings = async (req, res) => {
//   try {
//     const meetings = await Meeting.find()
//       .populate("hostId", "name email")
//       .sort({ createdAt: -1 });

//     const counts = await MeetingParticipant.aggregate([
//       {
//         $group: {
//           _id: "$meetingId",
//           users: { $addToSet: "$userId" },
//           current: {
//             $sum: {
//               $cond: [
//                 {
//                   $and: [
//                     { $lte: ["$leftAt", null] },
//                     { $eq: ["$status", "approved"] },
//                   ],
//                 },
//                 1,
//                 0,
//               ],
//             },
//           },
//         },
//       },
//     ]);

//     const map = {};
//     counts.forEach((c) => {
//       map[c._id.toString()] = {
//         totalJoined: c.users.length,
//         current: c.current,
//       };
//     });

//     const list = meetings.map((m) => {
//       const c = map[m._id.toString()] || { totalJoined: 0, current: 0 };
//       return {
//         meetingId: m._id,
//         roomId: m.roomId,
//         title: m.title,
//         host: m.hostId,
//         status: m.status,
//         isScreenSharing: m.isScreenSharing,
//         createdAt: m.createdAt,
//         updatedAt: m.updatedAt,
//         totalJoined: c.totalJoined,
//         usersInside: m.status === "active" ? c.current : 0,
//       };
//     });

//     res.status(200).json({ success: true, meetings: list });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Admin: ek meeting ke participants
// exports.getAdminMeetingParticipants = async (req, res) => {
//   try {
//     const meeting = await Meeting.findOne({ roomId: req.params.roomId });

//     if (!meeting) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Meeting not found" });
//     }

//     const participants = await MeetingParticipant.find({
//       meetingId: meeting._id,
//     })
//       .populate("userId", "name email phone")
//       .sort({ joinedAt: -1 });

//     res.status(200).json({ success: true, participants });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

// // Admin: meeting end karna
// exports.adminEndMeeting = async (req, res) => {
//   try {
//     const meeting = await Meeting.findOne({ roomId: req.params.roomId });

//     if (!meeting) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Meeting not found" });
//     }

//     if (meeting.status === "ended") {
//       return res
//         .status(400)
//         .json({ success: false, message: "Meeting already ended" });
//     }

//     meeting.status = "ended";
//     meeting.isScreenSharing = false;
//     meeting.screenSharedBy = null;
//     await meeting.save();

//     await MeetingParticipant.updateMany(
//       { meetingId: meeting._id, leftAt: null },
//       { leftAt: new Date() }
//     );

//     res.status(200).json({
//       success: true,
//       message: "Meeting ended by admin",
//       roomId: meeting.roomId,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };

const Meeting = require("../models/Meeting");
const MeetingParticipant = require("../models/MeetingParticipant");
const { stopRecordingForRoom } = require("./Recordingcontroller");

/* =====================================================
   HELPERS
===================================================== */

const generateMeetingCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz";

  const randomPart = (length) =>
    Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return `${randomPart(3)}-${randomPart(4)}-${randomPart(3)}`;
};

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

const serverError = (res, error, label) => {
  if (label) console.error(`${label}:`, error);
  return res.status(500).json({ success: false, message: error.message });
};

/* =====================================================
   CREATE MEETING
===================================================== */
exports.createMeeting = async (req, res) => {
  try {
    const { autoRecord = false, title, waitingRoom } = req.body || {};

    let roomId;
    let exists = true;

    while (exists) {
      roomId = generateMeetingCode();
      const meetingExists = await Meeting.findOne({ roomId });
      if (!meetingExists) exists = false;
    }

    const meeting = await Meeting.create({
      roomId,
      title: title || "Instant Meeting",
      createdBy: req.user.id,
      hostId: req.user.id,
      status: "active",
      autoRecord: Boolean(autoRecord),
      ...(typeof waitingRoom === "boolean" ? { waitingRoom } : {}),
    });

    res.status(201).json({
      success: true,
      message: "Meeting created successfully",

      meeting: {
        meetingId: meeting._id,
        roomId: meeting.roomId,
        title: meeting.title,
        status: meeting.status,
        hostId: meeting.hostId,
        createdBy: meeting.createdBy,
        autoRecord: meeting.autoRecord,
        createdAt: meeting.createdAt,
      },

      meetingLink: `meetapp://join/${meeting.roomId}`,
      webLink: `https://meet.infyle.com/${meeting.roomId}`,
    });
  } catch (error) {
    serverError(res, error, "Create Meeting Error");
  }
};

/* =====================================================
   GET MEETING
===================================================== */
exports.getMeetingByRoomId = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    serverError(res, error);
  }
};

// My Meetings
exports.getMyMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   END MEETING (recording auto-stop ke saath)
===================================================== */
exports.endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    // Sirf Host Meeting End Kar Sakta Hai
    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can end meeting");
    }

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting already ended");
    }

    meeting.status = "ended";
    meeting.isScreenSharing = false;
    meeting.screenSharedBy = null;
    await meeting.save();

    // Recording chal rahi ya paused ho to stop + upload pipeline chalao
    try {
      await stopRecordingForRoom(meeting, req.app.get("io"));
    } catch (e) {
      console.error("Auto stop recording failed:", e.message);
    }

    await MeetingParticipant.updateMany(
      { meetingId: meeting._id, leftAt: null },
      { leftAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: "Meeting ended successfully",
      roomId: meeting.roomId,
      endedBy: req.user.id,
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   JOIN MEETING (host ke liye auto-record ke saath)
===================================================== */
exports.joinMeeting = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) return fail(res, 400, "roomId is required");

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    // Meeting Ended Check
    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting has ended");
    }

    const isHost = meeting.hostId.toString() === req.user.id;

    // Removed user dobara aaye to waiting me jayega (host approval chahiye)
    const lastParticipant = await MeetingParticipant.findOne({
      meetingId: meeting._id,
      userId: req.user.id,
    }).sort({ createdAt: -1 });

    if (!isHost && lastParticipant && lastParticipant.status === "removed") {
      const participant = await MeetingParticipant.create({
        meetingId: meeting._id,
        userId: req.user.id,
        joinedAt: new Date(),
        isMuted: false,
        status: "waiting",
      });

      return res.status(200).json({
        success: true,
        waitingApproval: true,
        message: "Waiting for host approval",
        roomId: meeting.roomId,
        meetingId: meeting._id,
        participantId: participant._id,
      });
    }

    const alreadyJoined = await MeetingParticipant.findOne({
      meetingId: meeting._id,
      userId: req.user.id,
      leftAt: null,
    });

    if (alreadyJoined) {
      // Waiting me baitha user dobara join dabaye to waiting response do
      if (alreadyJoined.status === "waiting") {
        return res.status(200).json({
          success: true,
          waitingApproval: true,
          message: "Waiting for host approval",
          roomId: meeting.roomId,
          meetingId: meeting._id,
          participantId: alreadyJoined._id,
        });
      }

      return fail(res, 400, "Already joined this meeting");
    }

    // Host ko kabhi waiting room me nahi bhejna
    const needsApproval = meeting.waitingRoom && !isHost;

    const participant = await MeetingParticipant.create({
      meetingId: meeting._id,
      userId: req.user.id,
      joinedAt: new Date(),
      isMuted: false,
      status: needsApproval ? "waiting" : "approved",
    });

    // Waiting Room Enabled
    if (needsApproval) {
      return res.status(200).json({
        success: true,
        waitingApproval: true,
        message: "Waiting for host approval",
        roomId: meeting.roomId,
        meetingId: meeting._id,
        participantId: participant._id,
      });
    }

    // Auto Record: recording host ke device par hoti hai, isliye backend start nahi karta.
    // App response me meeting.autoRecord dekhkar khud /local-recording/start call kare.

    // Direct Join
    res.status(200).json({
      success: true,
      waitingApproval: false,
      message: "Joined meeting successfully",

      roomId: meeting.roomId,
      meetingId: meeting._id,
      participantId: participant._id,

      isHost,
      autoRecord: meeting.autoRecord,

      meeting,
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   SHARE
===================================================== */
exports.shareMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    res.status(200).json({
      success: true,
      roomId: meeting.roomId,
      meetingLink: `https://meet.infyle.com/${meeting.roomId}`,
      shareText: `Join my meeting

Meeting Code: ${meeting.roomId}

Link: https://meet.infyle.com/${meeting.roomId}`,
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   HISTORY / LISTS
===================================================== */
exports.getMeetingHistory = async (req, res) => {
  try {
    const meetings = await Meeting.find({ createdBy: req.user.id }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      totalMeetings: meetings.length,
      meetings,
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.getActiveMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      status: "active",
      createdBy: req.user.id,
    });

    res.status(200).json({ success: true, meetings });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   LEAVE
===================================================== */
exports.leaveMeeting = async (req, res) => {
  try {
    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    const participant = await MeetingParticipant.findOne({
      meetingId: meeting._id,
      userId: req.user.id,
      leftAt: null,
    });

    if (!participant) return fail(res, 404, "Participant not found");

    participant.leftAt = new Date();
    participant.duration = Math.floor(
      (participant.leftAt - participant.joinedAt) / 1000
    );

    await participant.save();

    res.status(200).json({
      success: true,
      duration: participant.duration,
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.getMeetingParticipants = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    const participants = await MeetingParticipant.find({
      meetingId: meeting._id,
    })
      .populate("userId", "name email phone")
      .sort({ joinedAt: -1 });

    res.status(200).json({ success: true, participants });
  } catch (error) {
    serverError(res, error);
  }
};

exports.getJoinedMeetingsHistory = async (req, res) => {
  try {
    const joinedMeetings = await MeetingParticipant.find({
      userId: req.user.id,
    })
      .populate({
        path: "meetingId",
        select: "roomId title status createdAt",
      })
      .sort({ joinedAt: -1 });

    res.status(200).json({
      success: true,
      totalMeetings: joinedMeetings.length,
      meetings: joinedMeetings,
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.getMeetingInfo = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    }).populate("hostId", "name email");

    if (!meeting) return fail(res, 404, "Meeting not found");

    const participantCount = await MeetingParticipant.countDocuments({
      meetingId: meeting._id,
      leftAt: null,
    });

    res.json({
      success: true,
      meeting,
      participantCount,
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   MUTE / UNMUTE
===================================================== */
exports.muteUser = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can mute users");
    }

    await MeetingParticipant.findOneAndUpdate(
      { meetingId: meeting._id, userId, leftAt: null },
      { isMuted: true }
    );

    res.status(200).json({
      success: true,
      message: "User muted successfully",
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.muteAll = async (req, res) => {
  try {
    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can mute all users");
    }

    await MeetingParticipant.updateMany(
      { meetingId: meeting._id, leftAt: null },
      { isMuted: true }
    );

    res.status(200).json({
      success: true,
      message: "All participants muted",
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.unmuteUser = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host allowed");
    }

    await MeetingParticipant.findOneAndUpdate(
      { meetingId: meeting._id, userId, leftAt: null },
      { isMuted: false }
    );

    res.json({ success: true, message: "User unmuted" });
  } catch (error) {
    serverError(res, error);
  }
};

exports.unmuteAll = async (req, res) => {
  try {
    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host allowed");
    }

    await MeetingParticipant.updateMany(
      { meetingId: meeting._id, leftAt: null },
      { isMuted: false }
    );

    res.json({ success: true, message: "All users unmuted" });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   REMOVE
===================================================== */
exports.removeUser = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return fail(res, 400, "roomId and userId are required");
    }

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    // Only Host Can Remove
    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can remove users");
    }

    // Host ko remove nahi kar sakte
    if (meeting.hostId.toString() === userId) {
      return fail(res, 400, "Host cannot remove himself");
    }

    const participant = await MeetingParticipant.findOne({
      meetingId: meeting._id,
      userId,
      leftAt: null,
    });

    if (!participant) return fail(res, 404, "Participant not found");

    participant.status = "removed";
    participant.leftAt = new Date();

    await participant.save();

    res.status(200).json({
      success: true,
      message: "User removed successfully",
      roomId,
      userId,
      removedAt: participant.leftAt,
    });
  } catch (error) {
    serverError(res, error, "REMOVE USER ERROR");
  }
};

exports.removeAll = async (req, res) => {
  try {
    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can remove all users");
    }

    // Host ko chhod ke baaki sab remove (removeUser jaisa hi status use hota hai)
    await MeetingParticipant.updateMany(
      {
        meetingId: meeting._id,
        userId: { $ne: meeting.hostId },
        leftAt: null,
      },
      {
        status: "removed",
        leftAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: "All participants removed",
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   TRANSFER HOST
===================================================== */
exports.transferHost = async (req, res) => {
  try {
    const { roomId, newHostId } = req.body;

    if (!roomId || !newHostId) {
      return fail(res, 400, "roomId and newHostId are required");
    }

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting has ended");
    }

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only current host can transfer host rights");
    }

    if (meeting.hostId.toString() === newHostId) {
      return fail(res, 400, "User is already host");
    }

    const participant = await MeetingParticipant.findOne({
      meetingId: meeting._id,
      userId: newHostId,
      leftAt: null,
      status: "approved",
    }).populate("userId", "name email phone");

    if (!participant) {
      return fail(res, 404, "Selected user is not an active participant");
    }

    const oldHostId = meeting.hostId.toString();

    meeting.hostId = newHostId;
    await meeting.save();

    res.status(200).json({
      success: true,
      message: "Host transferred successfully",
      roomId: meeting.roomId,
      oldHostId,
      newHostId,
      newHost: participant.userId,
    });
  } catch (error) {
    serverError(res, error, "TRANSFER HOST ERROR");
  }
};

/* =====================================================
   WAITING ROOM
===================================================== */
exports.getWaitingParticipants = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    const participants = await MeetingParticipant.find({
      meetingId: meeting._id,
      status: "waiting",
      leftAt: null,
    }).populate("userId", "name email phone");

    res.status(200).json({ success: true, participants });
  } catch (error) {
    serverError(res, error);
  }
};

exports.admitUser = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can admit users");
    }

    const participant = await MeetingParticipant.findOneAndUpdate(
      { meetingId: meeting._id, userId, status: "waiting", leftAt: null },
      { status: "approved" },
      { new: true }
    );

    if (!participant) {
      return fail(res, 404, "Waiting participant not found");
    }

    res.status(200).json({
      success: true,
      message: "User admitted",
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.rejectUser = async (req, res) => {
  try {
    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can reject users");
    }

    // leftAt set karna zaroori hai warna user dobara join nahi kar payega
    const participant = await MeetingParticipant.findOneAndUpdate(
      { meetingId: meeting._id, userId, status: "waiting", leftAt: null },
      { status: "rejected", leftAt: new Date() },
      { new: true }
    );

    if (!participant) {
      return fail(res, 404, "Waiting participant not found");
    }

    res.status(200).json({
      success: true,
      message: "User rejected",
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   SCREEN SHARE
===================================================== */
exports.startScreenShare = async (req, res) => {
  try {
    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting has ended");
    }

    // Ek time par sirf ek user share kare
    if (meeting.isScreenSharing) {
      return fail(res, 400, "Someone is already sharing screen");
    }

    meeting.isScreenSharing = true;
    meeting.screenSharedBy = req.user.id;

    await meeting.save();

    res.status(200).json({
      success: true,
      message: "Screen sharing started",
      roomId,
      sharedBy: req.user.id,
    });
  } catch (error) {
    serverError(res, error);
  }
};

exports.stopScreenShare = async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) return fail(res, 400, "Room ID is required");

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting has ended");
    }

    if (!meeting.isScreenSharing) {
      return fail(res, 400, "No screen is being shared");
    }

    const hostId = meeting.hostId?.toString();

    const screenSharerId = meeting.screenSharedBy?._id
      ? meeting.screenSharedBy._id.toString()
      : meeting.screenSharedBy?.toString();

    // Sirf Host ya Current Sharer Stop Kar Sakta Hai
    if (hostId !== req.user.id && screenSharerId !== req.user.id) {
      return fail(
        res,
        403,
        "Only host or current sharer can stop screen sharing"
      );
    }

    meeting.isScreenSharing = false;
    meeting.screenSharedBy = null;

    await meeting.save();

    res.status(200).json({
      success: true,
      message: "Screen sharing stopped successfully",
      roomId: meeting.roomId,
      stoppedBy: req.user.id,
    });
  } catch (error) {
    serverError(res, error, "STOP SCREEN SHARE ERROR");
  }
};

exports.getScreenShareStatus = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    }).populate("screenSharedBy", "name email");

    if (!meeting) return fail(res, 404, "Meeting not found");

    res.status(200).json({
      success: true,
      isScreenSharing: meeting.isScreenSharing,
      screenSharedBy: meeting.screenSharedBy,
    });
  } catch (error) {
    serverError(res, error);
  }
};

/* =====================================================
   ADMIN
===================================================== */
exports.getAdminStats = async (req, res) => {
  try {
    const [totalMeetings, activeMeetings, endedMeetings] = await Promise.all([
      Meeting.countDocuments(),
      Meeting.countDocuments({ status: "active" }),
      Meeting.countDocuments({ status: "ended" }),
    ]);

    // Abhi chal rahi meetings
    const liveMeetings = await Meeting.find({ status: "active" })
      .populate("hostId", "name email")
      .sort({ createdAt: -1 });

    const liveIds = liveMeetings.map((m) => m._id);

    // Har live meeting me kitne users abhi andar hain
    const counts = await MeetingParticipant.aggregate([
      {
        $match: {
          meetingId: { $in: liveIds },
          leftAt: null,
          status: "approved",
        },
      },
      { $group: { _id: "$meetingId", count: { $sum: 1 } } },
    ]);

    const countMap = {};
    counts.forEach((c) => (countMap[c._id.toString()] = c.count));

    const live = liveMeetings.map((m) => ({
      meetingId: m._id,
      roomId: m.roomId,
      title: m.title,
      host: m.hostId,
      participants: countMap[m._id.toString()] || 0,
      isScreenSharing: m.isScreenSharing,
      isRecording: m.isRecording,
      isRecordingPaused: m.isRecordingPaused,
      startedAt: m.createdAt,
    }));

    const usersInMeetings = live.reduce((s, m) => s + m.participants, 0);

    const waitingUsers = await MeetingParticipant.countDocuments({
      meetingId: { $in: liveIds },
      leftAt: null,
      status: "waiting",
    });

    const uniqueUsers = (await MeetingParticipant.distinct("userId")).length;

    res.status(200).json({
      success: true,
      stats: {
        totalMeetings,
        activeMeetings,
        endedMeetings,
        usersInMeetings,
        waitingUsers,
        uniqueUsers,
      },
      liveMeetings: live,
    });
  } catch (error) {
    serverError(res, error);
  }
};

// Admin: saari meetings + users count
exports.getAdminMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find()
      .populate("hostId", "name email")
      .sort({ createdAt: -1 });

    const counts = await MeetingParticipant.aggregate([
      {
        $group: {
          _id: "$meetingId",
          users: { $addToSet: "$userId" },
          current: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lte: ["$leftAt", null] },
                    { $eq: ["$status", "approved"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const map = {};
    counts.forEach((c) => {
      map[c._id.toString()] = {
        totalJoined: c.users.length,
        current: c.current,
      };
    });

    const list = meetings.map((m) => {
      const c = map[m._id.toString()] || { totalJoined: 0, current: 0 };
      return {
        meetingId: m._id,
        roomId: m.roomId,
        title: m.title,
        host: m.hostId,
        status: m.status,
        isScreenSharing: m.isScreenSharing,
        isRecording: m.isRecording,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        totalJoined: c.totalJoined,
        usersInside: m.status === "active" ? c.current : 0,
      };
    });

    res.status(200).json({ success: true, meetings: list });
  } catch (error) {
    serverError(res, error);
  }
};

// Admin: ek meeting ke participants
exports.getAdminMeetingParticipants = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    const participants = await MeetingParticipant.find({
      meetingId: meeting._id,
    })
      .populate("userId", "name email phone")
      .sort({ joinedAt: -1 });

    res.status(200).json({ success: true, participants });
  } catch (error) {
    serverError(res, error);
  }
};

// Admin: meeting end karna (recording auto-stop ke saath)
exports.adminEndMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) return fail(res, 404, "Meeting not found");

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting already ended");
    }

    meeting.status = "ended";
    meeting.isScreenSharing = false;
    meeting.screenSharedBy = null;
    await meeting.save();

    try {
      await stopRecordingForRoom(meeting, req.app.get("io"));
    } catch (e) {
      console.error("Auto stop recording failed:", e.message);
    }

    await MeetingParticipant.updateMany(
      { meetingId: meeting._id, leftAt: null },
      { leftAt: new Date() }
    );

    res.status(200).json({
      success: true,
      message: "Meeting ended by admin",
      roomId: meeting.roomId,
    });
  } catch (error) {
    serverError(res, error);
  }
};