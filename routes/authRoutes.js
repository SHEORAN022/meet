// const express = require("express");
// const router = express.Router();

// const {
//   register,
//   login,
// } = require("../controllers/authController");

// router.post("/register", register);
// router.post("/login", login);

// module.exports = router;

const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const uploadImage = require("../middleware/imageUploadMiddleware");

const {
  register,
  login,
  getProfile,
  updateProfile,
  removeProfilePhoto,
  updateEmail,
  changePassword,
} = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);

router.get("/profile", auth, getProfile);


router.put("/profile", auth, uploadImage.single("photo"), updateProfile);

router.delete("/profile/photo", auth, removeProfilePhoto);

router.put("/profile/email", auth, updateEmail);
router.put("/profile/change-password", auth, changePassword);

module.exports = router;