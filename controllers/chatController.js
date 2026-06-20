const Meeting = require("../models/Meeting");
const MeetingChat = require("../models/MeetingChat");


exports.getMeetingChats = async (req, res) => {
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const totalMessages = await MeetingChat.countDocuments({
      meetingId: meeting._id,
    });

    const chats = await MeetingChat.find({
      meetingId: meeting._id,
    })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const formattedChats = chats.map((chat) => ({
      _id: chat._id,
      message: chat.message,
      senderId: chat.senderId._id,
      senderName: chat.senderId.name,
      senderEmail: chat.senderId.email,
      createdAt: chat.createdAt,
    }));

    res.status(200).json({
      success: true,
      totalMessages,
      page,
      totalPages: Math.ceil(totalMessages / limit),
      chats: formattedChats,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete all chats of a meeting (host only - optional use)
exports.clearMeetingChats = async (req, res) => {
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

    if (meeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only host can clear chat",
      });
    }

    await MeetingChat.deleteMany({ meetingId: meeting._id });

    res.status(200).json({
      success: true,
      message: "Chat cleared successfully",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};