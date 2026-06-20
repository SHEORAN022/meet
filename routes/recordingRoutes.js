// routes/recordingRoutes.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  uploadRecording,
  getMeetingRecordings,
  getMyRecordings,
  downloadRecording,
  deleteRecording,
  getRecordingById,
} = require("../controllers/recordingController");

// Upload — multipart/form-data
router.post("/upload", auth, upload.single("recording"), uploadRecording);

// Get meeting ki saari recordings
router.get("/meeting/:roomId", auth, getMeetingRecordings);

// Meri recordings
router.get("/my", auth, getMyRecordings);

// Single recording detail
router.get("/:id", auth, getRecordingById);

// Download
router.get("/download/:id", auth, downloadRecording);

// Delete
router.delete("/:id", auth, deleteRecording);

module.exports = router;