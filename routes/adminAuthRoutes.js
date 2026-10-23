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

  adminLogin,

  getAdminProfile,

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

module.exports =
router;