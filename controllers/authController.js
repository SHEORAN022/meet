
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Meeting = require("../models/Meeting");
const MeetingParticipant = require("../models/MeetingParticipant");
// Register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,
      token,
      user,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Login
exports.login = async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      success: true,
      token,
      user,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};
// Admin: saare users + stats
exports.getAdminUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    const activeMeetingIds = await Meeting.distinct("_id", {
      status: "active",
    });

    const [inMeetingIds, joinedAgg, hostedAgg] = await Promise.all([
      // Abhi kaun si live meeting me hai
      MeetingParticipant.distinct("userId", {
        meetingId: { $in: activeMeetingIds },
        leftAt: null,
        status: "approved",
      }),

      // Har user ne kitni alag meetings join ki
      MeetingParticipant.aggregate([
        {
          $group: {
            _id: "$userId",
            meetings: { $addToSet: "$meetingId" },
          },
        },
        { $project: { count: { $size: "$meetings" } } },
      ]),

      // Har user ne kitni meetings banayi
      Meeting.aggregate([
        { $group: { _id: "$createdBy", count: { $sum: 1 } } },
      ]),
    ]);

    const inMeeting = new Set(inMeetingIds.map((id) => id.toString()));

    const joinedMap = {};
    joinedAgg.forEach((j) => (joinedMap[j._id.toString()] = j.count));

    const hostedMap = {};
    hostedAgg.forEach((h) => (hostedMap[h._id.toString()] = h.count));

    const list = users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      createdAt: u.createdAt,
      meetingsJoined: joinedMap[u._id.toString()] || 0,
      meetingsHosted: hostedMap[u._id.toString()] || 0,
      inMeetingNow: inMeeting.has(u._id.toString()),
    }));

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: users.length,
        newToday: users.filter((u) => u.createdAt >= startOfToday).length,
        newThisWeek: users.filter((u) => u.createdAt >= weekAgo).length,
        inMeetingNow: inMeeting.size,
      },
      users: list,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};