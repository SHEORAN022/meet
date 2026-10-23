const Admin =
require("../models/Admin");

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