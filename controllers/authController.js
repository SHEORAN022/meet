
// const User = require("../models/User");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");

// // Register
// exports.register = async (req, res) => {
//   try {
//     const { name, email, phone, password } = req.body;

//     const userExists = await User.findOne({ email });

//     if (userExists) {
//       return res.status(400).json({
//         success: false,
//         message: "Email already exists",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       name,
//       email,
//       phone,
//       password: hashedPassword,
//     });

//     const token = jwt.sign(
//       { id: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     res.status(201).json({
//       success: true,
//       token,
//       user,
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// // Login
// exports.login = async (req, res) => {
//   try {

//     const { email, password } = req.body;

//     const user = await User.findOne({ email });

//     if (!user) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const isMatch = await bcrypt.compare(
//       password,
//       user.password
//     );

//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid credentials",
//       });
//     }

//     const token = jwt.sign(
//       { id: user._id },
//       process.env.JWT_SECRET,
//       { expiresIn: "30d" }
//     );

//     res.status(200).json({
//       success: true,
//       token,
//       user,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };

const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bunnyService = require("../services/bunnyService");
const path = require("path");

// ─── Register ──────────────────────────────────────────────
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

// ─── Login ─────────────────────────────────────────────────
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

// ─── Get Profile ───────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {

    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ─── Update Profile (name / phone / photo — sab ek hi route se) ──
exports.updateProfile = async (req, res) => {
  try {

    const { name, phone } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ─── Name Update ──────────────────────────────────────
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name khali nahi ho sakta",
        });
      }
      user.name = name.trim();
    }

    // ─── Phone Update ─────────────────────────────────────
    if (phone !== undefined) {
      if (!phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Phone khali nahi ho sakta",
        });
      }
      user.phone = phone.trim();
    }

    // ─── Photo Update (agar file aayi hai to) ─────────────
    if (req.file) {

      // Purani photo Bunny se delete karo (agar hai to)
      if (user.profilePhotoPath) {
        try {
          await bunnyService.deleteFromBunny(user.profilePhotoPath);
          console.log("✅ Purani photo delete hui:", user.profilePhotoPath);
        } catch (deleteError) {
          console.log("⚠️ Purani photo delete fail (continue karte hain):", deleteError.message);
        }
      }

      // Nayi photo upload karo
      const ext = path.extname(req.file.originalname) || ".jpg";
      const fileName = `profile_${req.user.id}_${Date.now()}${ext}`;

      let bunnyResult;
      try {
        bunnyResult = await bunnyService.uploadToBunny(
          req.file.buffer,
          fileName,
          req.file.mimetype,
          "profile-photos"
        );
      } catch (bunnyError) {
        console.log("❌ Profile photo upload fail:", bunnyError.message);
        return res.status(500).json({
          success: false,
          message: "Photo upload fail hui: " + bunnyError.message,
        });
      }

      user.profilePhoto = bunnyResult.cdnUrl;
      user.profilePhotoPath = bunnyResult.bunnyPath;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile update ho gayi",
      user: updatedUser,
    });

  } catch (error) {

    console.log("UPDATE PROFILE ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ─── Remove Profile Photo ──────────────────────────────────
exports.removeProfilePhoto = async (req, res) => {
  try {

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.profilePhoto) {
      return res.status(400).json({
        success: false,
        message: "Koi profile photo nahi hai",
      });
    }

    if (user.profilePhotoPath) {
      try {
        await bunnyService.deleteFromBunny(user.profilePhotoPath);
      } catch (deleteError) {
        console.log("⚠️ Bunny delete fail:", deleteError.message);
      }
    }

    user.profilePhoto = "";
    user.profilePhotoPath = "";
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      message: "Profile photo remove ho gayi",
      user: updatedUser,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ─── Update Email ──────────────────────────────────────────
exports.updateEmail = async (req, res) => {
  try {

    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email required hai",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailExists = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user.id },
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Ye email already use mein hai",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.email = normalizedEmail;
    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    res.status(200).json({
      success: true,
      message: "Email update ho gaya",
      user: updatedUser,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};

// ─── Change Password ───────────────────────────────────────
exports.changePassword = async (req, res) => {
  try {

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password aur new password required hain",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password kam se kam 6 characters ka hona chahiye",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password galat hai",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password change ho gaya",
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};