const express = require("express");
const router = express.Router();

const adminAuth = require("../middleware/adminAuth");

const {
  register,
  login,
  getAdminUsers,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);

router.get("/admin/users", adminAuth, getAdminUsers);

module.exports = router;