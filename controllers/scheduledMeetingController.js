// controllers/scheduledMeetingController.js
const ScheduledMeeting = require("../models/ScheduledMeeting");
const Meeting = require("../models/Meeting");

// ─── Generate unique room code (same format jaisa instant meeting) ──
const generateMeetingCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz";

  const randomPart = (length) =>
    Array.from({ length }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join("");

  return `${randomPart(3)}-${randomPart(4)}-${randomPart(3)}`;
};

// ─── Schedule Meeting ─────────────────────────────────────
exports.scheduleMeeting = async (req, res) => {
  try {

    const {
      topic,
      description,
      scheduledDate,
      duration,
      waitingRoom,
      invitedEmails,
    } = req.body;

    // Validation
    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: "Meeting topic required hai",
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: "Meeting date aur time required hai",
      });
    }

    const parsedDate = new Date(scheduledDate);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. ISO format use karo (e.g. 2026-06-25T14:30:00.000Z)",
      });
    }

    if (parsedDate < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Meeting future ki date/time honi chahiye",
      });
    }

    // Unique roomId generate karo
    let roomId;
    let exists = true;

    while (exists) {
      roomId = generateMeetingCode();

      const roomExists = await ScheduledMeeting.findOne({ roomId });
      const meetingExists = await Meeting.findOne({ roomId });

      if (!roomExists && !meetingExists) {
        exists = false;
      }
    }

    const scheduledMeeting = await ScheduledMeeting.create({
      roomId,
      topic: topic.trim(),
      description: description?.trim() || "",
      scheduledDate: parsedDate,
      duration: duration ? parseInt(duration) : 30,
      createdBy: req.user.id,
      hostId: req.user.id,
      waitingRoom: waitingRoom !== undefined ? waitingRoom : true,
      invitedEmails: invitedEmails || [],
      status: "upcoming",
    });

    res.status(201).json({
      success: true,
      message: "Meeting schedule ho gayi",
      scheduledMeeting: {
        _id: scheduledMeeting._id,
        roomId: scheduledMeeting.roomId,
        topic: scheduledMeeting.topic,
        description: scheduledMeeting.description,
        scheduledDate: scheduledMeeting.scheduledDate,
        duration: scheduledMeeting.duration,
        waitingRoom: scheduledMeeting.waitingRoom,
        invitedEmails: scheduledMeeting.invitedEmails,
        status: scheduledMeeting.status,
        createdAt: scheduledMeeting.createdAt,
      },

      meetingLink: `meetapp://join/${scheduledMeeting.roomId}`,
      webLink: `https://meet.infyle.com/${scheduledMeeting.roomId}`,
    });

  } catch (error) {

    console.log("SCHEDULE MEETING ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ─── Get All My Scheduled Meetings ───────────────────────
exports.getMyScheduledMeetings = async (req, res) => {
  try {

    const { status } = req.query;

    const filter = { createdBy: req.user.id };

    if (status && status !== "all") {
      filter.status = status;
    }

    const meetings = await ScheduledMeeting.find(filter).sort({
      scheduledDate: 1,
    });

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

// ─── Get Upcoming Meetings (jo aane wali hain) ───────────
exports.getUpcomingMeetings = async (req, res) => {
  try {

    const meetings = await ScheduledMeeting.find({
      createdBy: req.user.id,
      status: "upcoming",
      scheduledDate: { $gte: new Date() },
    }).sort({ scheduledDate: 1 });

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

// ─── Get Single Scheduled Meeting by roomId ──────────────
exports.getScheduledMeetingByRoomId = async (req, res) => {
  try {

    const scheduledMeeting = await ScheduledMeeting.findOne({
      roomId: req.params.roomId,
    }).populate("hostId", "name email");

    if (!scheduledMeeting) {
      return res.status(404).json({
        success: false,
        message: "Scheduled meeting not found",
      });
    }

    res.status(200).json({
      success: true,
      scheduledMeeting,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Update Scheduled Meeting ─────────────────────────────
exports.updateScheduledMeeting = async (req, res) => {
  try {

    const { roomId } = req.params;
    const { topic, description, scheduledDate, duration, waitingRoom, invitedEmails } = req.body;

    const scheduledMeeting = await ScheduledMeeting.findOne({ roomId });

    if (!scheduledMeeting) {
      return res.status(404).json({
        success: false,
        message: "Scheduled meeting not found",
      });
    }

    // Sirf creator hi edit kar sakta hai
    if (scheduledMeeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Sirf creator hi meeting edit kar sakta hai",
      });
    }

    if (scheduledMeeting.status !== "upcoming") {
      return res.status(400).json({
        success: false,
        message: "Sirf upcoming meeting edit ho sakti hai",
      });
    }

    if (topic !== undefined) {
      if (!topic.trim()) {
        return res.status(400).json({
          success: false,
          message: "Topic khali nahi ho sakta",
        });
      }
      scheduledMeeting.topic = topic.trim();
    }

    if (description !== undefined) {
      scheduledMeeting.description = description.trim();
    }

    if (scheduledDate !== undefined) {
      const parsedDate = new Date(scheduledDate);

      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format",
        });
      }

      if (parsedDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Meeting future ki date/time honi chahiye",
        });
      }

      scheduledMeeting.scheduledDate = parsedDate;
    }

    if (duration !== undefined) {
      scheduledMeeting.duration = parseInt(duration);
    }

    if (waitingRoom !== undefined) {
      scheduledMeeting.waitingRoom = waitingRoom;
    }

    if (invitedEmails !== undefined) {
      scheduledMeeting.invitedEmails = invitedEmails;
    }

    await scheduledMeeting.save();

    res.status(200).json({
      success: true,
      message: "Scheduled meeting update ho gayi",
      scheduledMeeting,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Cancel Scheduled Meeting ─────────────────────────────
exports.cancelScheduledMeeting = async (req, res) => {
  try {

    const { roomId } = req.params;

    const scheduledMeeting = await ScheduledMeeting.findOne({ roomId });

    if (!scheduledMeeting) {
      return res.status(404).json({
        success: false,
        message: "Scheduled meeting not found",
      });
    }

    if (scheduledMeeting.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Sirf creator hi meeting cancel kar sakta hai",
      });
    }

    if (scheduledMeeting.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Meeting pehle se cancelled hai",
      });
    }

    if (scheduledMeeting.status === "started") {
      return res.status(400).json({
        success: false,
        message: "Started meeting cancel nahi ho sakti",
      });
    }

    scheduledMeeting.status = "cancelled";
    await scheduledMeeting.save();

    res.status(200).json({
      success: true,
      message: "Scheduled meeting cancel ho gayi",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Start Scheduled Meeting (jab time aa jaaye to actual meeting banao) ──
exports.startScheduledMeeting = async (req, res) => {
  try {

    const { roomId } = req.params;

    const scheduledMeeting = await ScheduledMeeting.findOne({ roomId });

    if (!scheduledMeeting) {
      return res.status(404).json({
        success: false,
        message: "Scheduled meeting not found",
      });
    }

    if (scheduledMeeting.hostId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Sirf host hi meeting start kar sakta hai",
      });
    }

    if (scheduledMeeting.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled meeting start nahi ho sakti",
      });
    }

    if (scheduledMeeting.status === "started") {
      // Already started — same meeting detail bhej do
      const existingMeeting = await Meeting.findById(scheduledMeeting.meetingId);
      return res.status(200).json({
        success: true,
        message: "Meeting already started hai",
        meeting: existingMeeting,
        roomId: scheduledMeeting.roomId,
      });
    }

    // Actual Meeting create karo same roomId ke saath
    const meeting = await Meeting.create({
      roomId: scheduledMeeting.roomId,
      title: scheduledMeeting.topic,
      createdBy: scheduledMeeting.createdBy,
      hostId: scheduledMeeting.hostId,
      waitingRoom: scheduledMeeting.waitingRoom,
      status: "active",
    });

    scheduledMeeting.status = "started";
    scheduledMeeting.meetingId = meeting._id;
    await scheduledMeeting.save();

    res.status(201).json({
      success: true,
      message: "Scheduled meeting start ho gayi",

      meeting: {
        meetingId: meeting._id,
        roomId: meeting.roomId,
        title: meeting.title,
        status: meeting.status,
        hostId: meeting.hostId,
        createdAt: meeting.createdAt,
      },

      meetingLink: `meetapp://join/${meeting.roomId}`,
      webLink: `https://meet.infyle.com/${meeting.roomId}`,
    });

  } catch (error) {
    console.log("START SCHEDULED MEETING ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};