// const express = require("express");
// const router = express.Router();

// const auth = require("../middleware/authMiddleware");
// const adminAuth = require("../middleware/adminAuth");

// const {
//   getMeetingChats,
// } = require("../controllers/chatController");

// const {
//   createMeeting,
//   getMeetingByRoomId,
//   getMyMeetings,
//   endMeeting,
//   joinMeeting,
//   getMeetingHistory,
//   getActiveMeetings,
//   shareMeeting,
//   leaveMeeting,
//   getMeetingParticipants,
//   getJoinedMeetingsHistory,
//   muteUser,
//   muteAll,
//   removeUser,
//   removeAll,
//   unmuteUser,
//   unmuteAll,
//   getMeetingInfo,
//   getWaitingParticipants,
//   admitUser,
//   rejectUser,
//   transferHost,
//   startScreenShare,
//   stopScreenShare,
//   getScreenShareStatus,

//   // Admin
//   getAdminStats,
//   getAdminMeetings,
//   getAdminMeetingParticipants,
//   adminEndMeeting,
// } = require("../controllers/meetingController");

// /* ================= ADMIN ROUTES ================= */
// /* Ye sabse upar rakhe hain taaki "/:roomId" se na takraye */

// router.get("/admin/stats", adminAuth, getAdminStats);

// router.get("/admin/list", adminAuth, getAdminMeetings);

// router.get(
//   "/admin/participants/:roomId",
//   adminAuth,
//   getAdminMeetingParticipants
// );

// router.put("/admin/end/:roomId", adminAuth, adminEndMeeting);

// /* ================= USER ROUTES ================= */

// // Create Meeting
// router.post("/create", auth, createMeeting);

// router.get("/history", auth, getMeetingHistory);

// router.get("/joined-history", auth, getJoinedMeetingsHistory);

// router.get("/active", auth, getActiveMeetings);

// router.get("/share/:roomId", auth, shareMeeting);

// router.post("/leave", auth, leaveMeeting);

// router.get("/participants/:roomId", auth, getMeetingParticipants);

// router.get("/my-meetings", auth, getMyMeetings);

// // End Meeting
// router.put("/end/:roomId", auth, endMeeting);

// router.post("/join", auth, joinMeeting);

// router.post("/mute-user", auth, muteUser);

// router.post("/mute-all", auth, muteAll);

// router.post("/remove-user", auth, removeUser);

// router.post("/remove-all", auth, removeAll);

// router.get("/info/:roomId", auth, getMeetingInfo);

// router.post("/unmute-user", auth, unmuteUser);

// router.post("/unmute-all", auth, unmuteAll);

// router.post("/transfer-host", auth, transferHost);

// router.post("/screen-share/start", auth, startScreenShare);

// router.post("/screen-share/stop", auth, stopScreenShare);

// router.get("/screen-share/:roomId", auth, getScreenShareStatus);

// router.get("/waiting/:roomId", auth, getWaitingParticipants);

// router.post("/admit-user", auth, admitUser);

// router.post("/reject-user", auth, rejectUser);

// router.get("/chat/:roomId", auth, getMeetingChats);

// // Sabse last me rakhna
// router.get("/:roomId", auth, getMeetingByRoomId);

// module.exports = router;
const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");
const adminAuth = require("../middleware/adminAuth");

const { getMeetingChats } = require("../controllers/chatController");

const {
  startRecording,
  pauseRecording,
  resumeRecording,
  stopRecording,
  uploadRecording,
  stopAndUploadRecording,
  getRecordingStatus,
  getRoomRecordings,
  getMyRecordings,
  deleteRecording,

  // Admin
  getAdminRecordings,
  adminDeleteRecording,
} = require("../controllers/Recordingcontroller");

const {
  createMeeting,
  getMeetingByRoomId,
  getMyMeetings,
  endMeeting,
  joinMeeting,
  getMeetingHistory,
  getActiveMeetings,
  shareMeeting,
  leaveMeeting,
  getMeetingParticipants,
  getJoinedMeetingsHistory,
  muteUser,
  muteAll,
  removeUser,
  removeAll,
  unmuteUser,
  unmuteAll,
  getMeetingInfo,
  getWaitingParticipants,
  admitUser,
  rejectUser,
  transferHost,
  startScreenShare,
  stopScreenShare,
  getScreenShareStatus,

  // Admin
  getAdminStats,
  getAdminMeetings,
  getAdminMeetingParticipants,
  adminEndMeeting,
} = require("../controllers/meetingController");

/* ================= ADMIN ROUTES ================= */
/* Ye sabse upar rakhe hain taaki "/:roomId" se na takraye */

router.get("/admin/stats", adminAuth, getAdminStats);

router.get("/admin/list", adminAuth, getAdminMeetings);

router.get(
  "/admin/participants/:roomId",
  adminAuth,
  getAdminMeetingParticipants
);

router.put("/admin/end/:roomId", adminAuth, adminEndMeeting);

// Admin: saari recordings (page, limit, status, search query params)
router.get("/admin/recordings", adminAuth, getAdminRecordings);

// Admin: recording delete (Bunny + DB). ?force=true se atki hui recording bhi
router.delete("/admin/recordings/:recordingId", adminAuth, adminDeleteRecording);

/* ================= RECORDING ROUTES ================= */

router.post("/local-recording/start", auth, startRecording);
router.post("/local-recording/pause", auth, pauseRecording);
router.post("/local-recording/resume", auth, resumeRecording);
router.post("/local-recording/stop", auth, stopRecording);

// Body raw video file hoti hai (JSON nahi), seedha Bunny par stream hoti hai
router.put("/local-recording/upload/:recordingId", auth, uploadRecording);

// AUTOMATIC: Stop + Upload ek hi call me (host Stop dabate hi yahi call karo)
router.put(
  "/local-recording/stop-upload/:recordingId",
  auth,
  stopAndUploadRecording
);

router.get("/recording/status/:roomId", auth, getRecordingStatus);
router.get("/recording/list/:roomId", auth, getRoomRecordings);
router.get("/recording/my", auth, getMyRecordings);
router.delete("/recording/:recordingId", auth, deleteRecording);

/* ================= USER ROUTES ================= */

// Create Meeting
router.post("/create", auth, createMeeting);

router.get("/history", auth, getMeetingHistory);

router.get("/joined-history", auth, getJoinedMeetingsHistory);

router.get("/active", auth, getActiveMeetings);

router.get("/share/:roomId", auth, shareMeeting);

router.post("/leave", auth, leaveMeeting);

router.get("/participants/:roomId", auth, getMeetingParticipants);

router.get("/my-meetings", auth, getMyMeetings);

// End Meeting
router.put("/end/:roomId", auth, endMeeting);

router.post("/join", auth, joinMeeting);

router.post("/mute-user", auth, muteUser);

router.post("/mute-all", auth, muteAll);

router.post("/remove-user", auth, removeUser);

router.post("/remove-all", auth, removeAll);

router.get("/info/:roomId", auth, getMeetingInfo);

router.post("/unmute-user", auth, unmuteUser);

router.post("/unmute-all", auth, unmuteAll);

router.post("/transfer-host", auth, transferHost);

router.post("/screen-share/start", auth, startScreenShare);

router.post("/screen-share/stop", auth, stopScreenShare);

router.get("/screen-share/:roomId", auth, getScreenShareStatus);

router.get("/waiting/:roomId", auth, getWaitingParticipants);

router.post("/admit-user", auth, admitUser);

router.post("/reject-user", auth, rejectUser);

router.get("/chat/:roomId", auth, getMeetingChats);

// Sabse last me rakhna
router.get("/:roomId", auth, getMeetingByRoomId);

module.exports = router;