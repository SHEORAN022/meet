const Admin =
require("../models/Admin");

const User = require("../models/User");
const bcrypt =
require("bcryptjs");

const jwt =
require("jsonwebtoken");


// Register Admin
exports.adminRegister =
async (req, res) => {
  try {

    const {
      name,
      email,
      password
    } = req.body;

    if (
      !name ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "All fields are required",
      });
    }

    const existingAdmin =
      await Admin.findOne({
        email,
      });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message:
          "Admin already exists",
      });
    }

    const admin =
      await Admin.create({
        name,
        email,
        password,
        role: "admin",
      });

    const token =
      jwt.sign(
        {
          id: admin._id,
          role: admin.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

    res.status(201).json({
      success: true,
      message:
        "Admin registered successfully",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message:
        error.message,
    });

  }
};


// Login Admin
exports.adminLogin =
async (req, res) => {
  try {

    const {
      email,
      password
    } = req.body;

    if (
      !email ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password required",
      });
    }

    const admin =
      await Admin.findOne({
        email,
      });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid credentials",
      });
    }

    const isMatch =
      await bcrypt.compare(
        password,
        admin.password
      );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid credentials",
      });
    }

    const token =
      jwt.sign(
        {
          id: admin._id,
          role: admin.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

    res.status(200).json({
      success: true,
      message:
        "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message:
        error.message,
    });

  }
};


// Get Profile
exports.getAdminProfile =
async (req, res) => {
  try {

    const admin =
      await Admin.findById(
        req.admin.id
      ).select("-password");

    res.status(200).json({
      success: true,
      admin,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message:
        error.message,
    });

  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
exports.getDashboardStats = async (req, res) => {
  try {
    const Meeting = require("../models/Meeting");
    const MeetingParticipant = require("../models/MeetingParticipant");
    const User = require("../models/User");

    const [
      totalMeetings,
      activeMeetings,
      endedMeetings,
      totalUsers,
      recentMeetings,
    ] = await Promise.all([
      Meeting.countDocuments({}),
      Meeting.countDocuments({ status: "active" }),
      Meeting.countDocuments({ status: "ended" }),
      User.countDocuments({}),
      Meeting.find({})
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("hostId", "name email"),
    ]);

    // Har meeting mein total participants count
    const meetingsWithParticipants = await Promise.all(
      recentMeetings.map(async (meeting) => {
        const totalParticipants = await MeetingParticipant.countDocuments({
          meetingId: meeting._id,
        });
        const activeParticipants = await MeetingParticipant.countDocuments({
          meetingId: meeting._id,
          leftAt: null,
          status: "approved",
        });
        return {
          _id: meeting._id,
          roomId: meeting.roomId,
          title: meeting.title,
          status: meeting.status,
          hostName: meeting.hostId?.name || "Unknown",
          hostEmail: meeting.hostId?.email || "",
          createdAt: meeting.createdAt,
          totalParticipants,
          activeParticipants,
        };
      })
    );

    res.status(200).json({
      success: true,
      stats: {
        totalMeetings,
        activeMeetings,
        endedMeetings,
        totalUsers,
      },
      recentMeetings: meetingsWithParticipants,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllMeetingsForAdmin = async (req, res) => {
  try {
    const Meeting = require("../models/Meeting");
    const MeetingParticipant = require("../models/MeetingParticipant");

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status;

    // Filter object
    const filter = {};
    if (statusFilter && statusFilter !== "all") {
      filter.status = statusFilter;
    }

    const [total, meetings] = await Promise.all([
      Meeting.countDocuments(filter),
      Meeting.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("hostId", "name email"),
    ]);

    const meetingsWithParticipants = await Promise.all(
      meetings.map(async (meeting) => {
        const [totalParticipants, activeParticipants] = await Promise.all([
          MeetingParticipant.countDocuments({ meetingId: meeting._id }),
          MeetingParticipant.countDocuments({
            meetingId: meeting._id,
            leftAt: null,
            status: "approved",
          }),
        ]);
        return {
          _id: meeting._id,
          roomId: meeting.roomId,
          title: meeting.title,
          status: meeting.status,
          hostName: meeting.hostId?.name || "Unknown",
          hostEmail: meeting.hostId?.email || "",
          createdAt: meeting.createdAt,
          totalParticipants,
          activeParticipants,
        };
      })
    );

    res.status(200).json({
      success: true,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      // Active/Ended counts for filter tabs
      activeCount: await Meeting.countDocuments({ status: "active" }),
      endedCount: await Meeting.countDocuments({ status: "ended" }),
      meetings: meetingsWithParticipants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};