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

    const chats = await MeetingChat.find({
      meetingId: meeting._id,
    })
      .populate(
        "senderId",
        "name email"
      )
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      totalMessages: chats.length,
      chats,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};