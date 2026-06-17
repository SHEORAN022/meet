const Meeting = require("../models/Meeting");
const MeetingParticipant = require("../models/MeetingParticipant");

const generateMeetingCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz";

  const randomPart = (length) =>
    Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return `${randomPart(3)}-${randomPart(4)}-${randomPart(3)}`;
};


exports.createMeeting = async (req, res) => {
  try {

    let roomId;
    let exists = true;

    while (exists) {

      roomId = generateMeetingCode();

      const meetingExists = await Meeting.findOne({
        roomId,
      });

      if (!meetingExists) {
        exists = false;
      }
    }

    const meeting = await Meeting.create({
      roomId,
      title: "Instant Meeting",
      createdBy: req.user.id,
      hostId: req.user.id,
      status: "active",
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
        createdAt: meeting.createdAt,
      },

      meetingLink: `meetapp://join/${meeting.roomId}`,

      webLink: `https://meet.infyle.com/${meeting.roomId}`,
    });

  } catch (error) {

    console.error("Create Meeting Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.getMeetingByRoomId = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.status(200).json({
      success: true,
      meeting,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// My Meetings
exports.getMyMeetings = async (req, res) => {
  try {

    const meetings = await Meeting.find({
      createdBy: req.user.id,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: meetings.length,
      meetings,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.endMeeting = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Sirf Host Meeting End Kar Sakta Hai
    if (
      meeting.hostId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Only host can end meeting",
      });
    }


    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Meeting already ended",
      });
    }

    meeting.status = "ended";

    await meeting.save();

    res.status(200).json({
      success: true,
      message: "Meeting ended successfully",
      roomId: meeting.roomId,
      endedBy: req.user.id,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.joinMeeting = async (req, res) => {
  try {

    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Meeting Ended Check
    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Meeting has ended",
      });
    }
const lastParticipant =
await MeetingParticipant.findOne({
  meetingId: meeting._id,
  userId: req.user.id,
})
.sort({ createdAt: -1 });

if (
  lastParticipant &&
  lastParticipant.status === "removed"
) {

  const participant =
  await MeetingParticipant.create({
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
    // Removed User Check
    // const removedUser =
    //   await MeetingParticipant.findOne({
    //     meetingId: meeting._id,
    //     userId: req.user.id,
    //     isRemoved: true,
    //   });

    // if (removedUser) {
    //   return res.status(403).json({
    //     success: false,
    //     message: "You have been removed from this meeting",
    //   });
    // }

  
    const alreadyJoined =
      await MeetingParticipant.findOne({
        meetingId: meeting._id,
        userId: req.user.id,
        leftAt: null,
      });

    if (alreadyJoined) {
      return res.status(400).json({
        success: false,
        message: "Already joined this meeting",
      });
    }

    // Create Participant
    const participant =
      await MeetingParticipant.create({
        meetingId: meeting._id,
        userId: req.user.id,
        joinedAt: new Date(),

        isMuted: false,
        isRemoved: false,

        status: meeting.waitingRoom
          ? "waiting"
          : "approved",
      });

    // Waiting Room Enabled
    if (
      meeting.waitingRoom &&
      participant.status === "waiting"
    ) {
      return res.status(200).json({
        success: true,
        waitingApproval: true,
        message:
          "Waiting for host approval",
        roomId: meeting.roomId,
        meetingId: meeting._id,
        participantId: participant._id,
      });
    }

    // Direct Join
    res.status(200).json({
      success: true,
      waitingApproval: false,
      message: "Joined meeting successfully",

      roomId: meeting.roomId,
      meetingId: meeting._id,
      participantId: participant._id,

      isHost:
        meeting.hostId.toString() ===
        req.user.id,

      meeting,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.shareMeeting = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.status(200).json({
      success: true,
      roomId: meeting.roomId,
      meetingLink: `https://meet.infyle.com/${meeting.roomId}`,
      shareText: `Join my meeting

Meeting Code: ${meeting.roomId}

Link: https://meet.infyle.com/${meeting.roomId}`,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMeetingHistory = async (req, res) => {
  try {

    const meetings = await Meeting.find({
      createdBy: req.user.id,
    })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalMeetings: meetings.length,
      meetings,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getActiveMeetings = async (req, res) => {
  try {

    const meetings = await Meeting.find({
      status: "active",
      createdBy: req.user.id,
    });

    res.status(200).json({
      success: true,
      meetings,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.leaveMeeting = async (req, res) => {
  try {

    const { roomId } = req.body;

    const meeting = await Meeting.findOne({
      roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const participant =
      await MeetingParticipant.findOne({
        meetingId: meeting._id,
        userId: req.user.id,
        leftAt: null,
      });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

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

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.getMeetingParticipants = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const participants =
      await MeetingParticipant.find({
        meetingId: meeting._id,
      })
      .populate("userId", "name email phone")
      .sort({ joinedAt: -1 });

    res.status(200).json({
      success: true,
      participants,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

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

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.getMeetingInfo = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    }).populate("hostId", "name email");

    const participantCount =
      await MeetingParticipant.countDocuments({
        meetingId: meeting._id,
        leftAt: null,
      });

    res.json({
      success: true,
      meeting,
      participantCount,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.muteUser = async (req, res) => {
  try {

    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only host can mute users",
      });
    }

    await MeetingParticipant.findOneAndUpdate(
      {
        meetingId: meeting._id,
        userId,
        leftAt: null,
      },
      {
        isMuted: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "User muted successfully",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.muteAll = async (req, res) => {
  try {

    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only host can mute all users",
      });
    }

    await MeetingParticipant.updateMany(
      {
        meetingId: meeting._id,
        leftAt: null,
      },
      {
        isMuted: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "All participants muted",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// exports.removeUser = async (req, res) => {
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
//         message: "Only host can remove users",
//       });
//     }

//     await MeetingParticipant.findOneAndUpdate(
//       {
//         meetingId: meeting._id,
//         userId,
//         leftAt: null,
//       },
//       {
//         isRemoved: true,
//         leftAt: new Date(),
//       }
//     );

//     res.status(200).json({
//       success: true,
//       message: "User removed successfully",
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };
exports.removeUser = async (req, res) => {
  try {

    const { roomId, userId } = req.body;

    if (!roomId || !userId) {
      return res.status(400).json({
        success: false,
        message: "roomId and userId are required",
      });
    }

    const meeting = await Meeting.findOne({
      roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Only Host Can Remove
    if (
      meeting.hostId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Only host can remove users",
      });
    }

    // Host ko remove nahi kar sakte
    if (
      meeting.hostId.toString() === userId
    ) {
      return res.status(400).json({
        success: false,
        message: "Host cannot remove himself",
      });
    }

    const participant =
      await MeetingParticipant.findOne({
        meetingId: meeting._id,
        userId,
        leftAt: null,
      });

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Participant not found",
      });
    }

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

    console.log(
      "REMOVE USER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.removeAll = async (req, res) => {
  try {

    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only host can remove all users",
      });
    }

    await MeetingParticipant.updateMany(
      {
        meetingId: meeting._id,
        leftAt: null,
      },
      {
        isRemoved: true,
        leftAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: "All participants removed",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.unmuteUser = async (req, res) => {
  try {

    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only host allowed",
      });
    }

    await MeetingParticipant.findOneAndUpdate(
      {
        meetingId: meeting._id,
        userId,
        leftAt: null,
      },
      {
        isMuted: false,
      }
    );

    res.json({
      success: true,
      message: "User unmuted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.unmuteAll = async (req, res) => {
  try {

    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    await MeetingParticipant.updateMany(
      {
        meetingId: meeting._id,
        leftAt: null,
      },
      {
        isMuted: false,
      }
    );

    res.json({
      success: true,
      message: "All users unmuted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// exports.transferHost = async (req, res) => {
//   try {

//     const { roomId, newHostId } = req.body;

//     const meeting = await Meeting.findOne({
//       roomId,
//     });

//     if (!meeting) {
//       return res.status(404).json({
//         success: false,
//         message: "Meeting not found",
//       });
//     }

//     // Current Host Check
//     if (
//       meeting.hostId.toString() !==
//       req.user.id
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "Only current host can transfer host rights",
//       });
//     }

//     // Check Participant Exists
//     const participant =
//       await MeetingParticipant.findOne({
//         meetingId: meeting._id,
//         userId: newHostId,
//         leftAt: null,
//       });

//     if (!participant) {
//       return res.status(404).json({
//         success: false,
//         message: "Selected user is not in meeting",
//       });
//     }

//     // Transfer Host
//     meeting.hostId = newHostId;

//     await meeting.save();

//     res.status(200).json({
//       success: true,
//       message: "Host transferred successfully",
//       roomId: meeting.roomId,
//       newHostId,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };
exports.transferHost = async (req, res) => {
  try {

    const { roomId, newHostId } = req.body;

    // Validation
    if (!roomId || !newHostId) {
      return res.status(400).json({
        success: false,
        message: "roomId and newHostId are required",
      });
    }

    const meeting = await Meeting.findOne({
      roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    // Meeting Ended Check
    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Meeting has ended",
      });
    }

    // Current Host Check
    if (
      meeting.hostId.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Only current host can transfer host rights",
      });
    }

    // Same User Check
    if (
      meeting.hostId.toString() === newHostId
    ) {
      return res.status(400).json({
        success: false,
        message: "User is already host",
      });
    }

    // Participant Check
    const participant =
      await MeetingParticipant.findOne({
        meetingId: meeting._id,
        userId: newHostId,
        leftAt: null,
        isRemoved: false,
        status: "approved",
      }).populate(
        "userId",
        "name email phone"
      );

    if (!participant) {
      return res.status(404).json({
        success: false,
        message: "Selected user is not an active participant",
      });
    }

    const oldHostId =
      meeting.hostId.toString();

    // Transfer Host
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

    console.log(
      "TRANSFER HOST ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.getWaitingParticipants = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const participants =
      await MeetingParticipant.find({
        meetingId: meeting._id,
        status: "waiting",
      }).populate(
        "userId",
        "name email phone"
      );

    res.status(200).json({
      success: true,
      participants,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.admitUser = async (req, res) => {
  try {

    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({
      roomId,
    });

    await MeetingParticipant.findOneAndUpdate(
      {
        meetingId: meeting._id,
        userId,
      },
      {
        status: "approved",
      }
    );

    res.status(200).json({
      success: true,
      message: "User admitted",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.rejectUser = async (req, res) => {
  try {

    const { roomId, userId } = req.body;

    const meeting = await Meeting.findOne({
      roomId,
    });

    await MeetingParticipant.findOneAndUpdate(
      {
        meetingId: meeting._id,
        userId,
      },
      {
        status: "rejected",
      }
    );

    res.status(200).json({
      success: true,
      message: "User rejected",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.startScreenShare = async (req, res) => {
  try {

    const { roomId } = req.body;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Meeting has ended",
      });
    }

    // Ek time par sirf ek user share kare
    if (meeting.isScreenSharing) {
      return res.status(400).json({
        success: false,
        message: "Someone is already sharing screen",
      });
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

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

exports.stopScreenShare = async (req, res) => {
  try {

    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    if (meeting.status === "ended") {
      return res.status(400).json({
        success: false,
        message: "Meeting has ended",
      });
    }

    if (!meeting.isScreenSharing) {
      return res.status(400).json({
        success: false,
        message: "No screen is being shared",
      });
    }

    const hostId = meeting.hostId?.toString();

    const screenSharerId =
      meeting.screenSharedBy?._id
        ? meeting.screenSharedBy._id.toString()
        : meeting.screenSharedBy?.toString();

    // Sirf Host ya Current Sharer Stop Kar Sakta Hai
    if (
      hostId !== req.user.id &&
      screenSharerId !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Only host or current sharer can stop screen sharing",
      });
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

    console.log("STOP SCREEN SHARE ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
exports.getScreenShareStatus = async (req, res) => {
  try {

    const meeting = await Meeting.findOne({
      roomId: req.params.roomId,
    }).populate(
      "screenSharedBy",
      "name email"
    );

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    res.status(200).json({
      success: true,
      isScreenSharing: meeting.isScreenSharing,
      screenSharedBy: meeting.screenSharedBy,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};