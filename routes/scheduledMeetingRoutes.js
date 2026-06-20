// routes/scheduledMeetingRoutes.js
const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  scheduleMeeting,
  getMyScheduledMeetings,
  getUpcomingMeetings,
  getScheduledMeetingByRoomId,
  updateScheduledMeeting,
  cancelScheduledMeeting,
  startScheduledMeeting,
} = require("../controllers/scheduledMeetingController");

// Create
router.post("/schedule", auth, scheduleMeeting);

// Get all (with status filter)
router.get("/my-scheduled", auth, getMyScheduledMeetings);

// Get upcoming only
router.get("/upcoming", auth, getUpcomingMeetings);

// Get single
router.get("/:roomId", auth, getScheduledMeetingByRoomId);

// Update
router.put("/:roomId", auth, updateScheduledMeeting);

// Cancel
router.delete("/:roomId", auth, cancelScheduledMeeting);

// Start (scheduled → actual meeting)
router.post("/:roomId/start", auth, startScheduledMeeting);

module.exports = router;