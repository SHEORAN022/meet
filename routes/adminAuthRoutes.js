const express =
require("express");

const router =
express.Router();

const adminAuth =
require(
  "../middleware/adminAuth"
);

const {

  adminRegister,
  getDashboardStats, 
  adminLogin,
getAllUsers,
  getAdminProfile,
 getAllMeetingsForAdmin, 
} = require(
  "../controllers/adminAuthController"
);


// Register
router.post(
  "/register",
  adminRegister
);

// Login
router.post(
  "/login",
  adminLogin
);

// Profile
router.get(
  "/profile",
  adminAuth,
  getAdminProfile
);
router.get("/users", adminAuth, getAllUsers);
router.get("/stats", adminAuth, getDashboardStats);
router.get("/meetings", adminAuth, getAllMeetingsForAdmin); 
module.exports =
router;