const crypto = require("crypto");
const Meeting = require("../models/Meeting");
const Recording = require("../models/Recording");
const bunny = require("../services/bunnyService");

/*
  LOCAL RECORDING (free)
  - Recording host ke browser me hoti hai (MediaRecorder)
  - Backend sirf state track karta hai + final file Bunny par stream karta hai
  - Zego Cloud Recording ki zaroorat nahi
*/

const MAX_UPLOAD_MB = Number(process.env.MAX_RECORDING_MB || 1024);

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

const getHostMeeting = async (roomId, userId, action) => {
  if (!roomId) return { error: { code: 400, message: "roomId is required" } };

  const meeting = await Meeting.findOne({ roomId });
  if (!meeting) return { error: { code: 404, message: "Meeting not found" } };

  if (meeting.hostId.toString() !== userId) {
    return {
      error: { code: 403, message: `Only host can ${action} recording` },
    };
  }

  return { meeting };
};

/* ---------- START ---------- */
exports.startLocalRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "start");
    if (error) return fail(res, error.code, error.message);

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting has ended");
    }

    // Atomic lock: ek time par ek hi recording
    const locked = await Meeting.findOneAndUpdate(
      { _id: meeting._id, isRecording: false },
      { isRecording: true, isRecordingPaused: false }
    );
    if (!locked) return fail(res, 400, "Recording already in progress");

    const recording = await Recording.create({
      meetingId: meeting._id,
      roomId,
      startedBy: req.user.id,
      source: "local",
      status: "recording",
    });

    req.app.get("io")?.to(roomId).emit("recording-started", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({
      success: true,
      message: "Recording started",
      recordingId: recording._id,
    });
  } catch (error) {
    console.error("LOCAL START ERROR:", error);
    fail(res, 500, error.message);
  }
};

/* ---------- PAUSE ---------- */
exports.pauseLocalRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "pause");
    if (error) return fail(res, error.code, error.message);

    const recording = await Recording.findOneAndUpdate(
      { meetingId: meeting._id, source: "local", status: "recording" },
      { status: "paused" },
      { new: true, sort: { createdAt: -1 } }
    );
    if (!recording) return fail(res, 400, "No active recording to pause");

    meeting.isRecordingPaused = true;
    await meeting.save();

    req.app.get("io")?.to(roomId).emit("recording-paused", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({ success: true, message: "Recording paused" });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ---------- RESUME ---------- */
exports.resumeLocalRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "resume");
    if (error) return fail(res, error.code, error.message);

    const recording = await Recording.findOneAndUpdate(
      { meetingId: meeting._id, source: "local", status: "paused" },
      { status: "recording" },
      { new: true, sort: { createdAt: -1 } }
    );
    if (!recording) return fail(res, 400, "Recording is not paused");

    meeting.isRecordingPaused = false;
    await meeting.save();

    req.app.get("io")?.to(roomId).emit("recording-resumed", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({ success: true, message: "Recording resumed" });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ---------- STOP ----------
   Isse sirf state "processing" hoti hai. File upload alag endpoint se hota hai. */
exports.stopLocalRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "stop");
    if (error) return fail(res, error.code, error.message);

    const recording = await Recording.findOneAndUpdate(
      {
        meetingId: meeting._id,
        source: "local",
        status: { $in: ["recording", "paused"] },
      },
      { status: "processing", stoppedAt: new Date() },
      { new: true, sort: { createdAt: -1 } }
    );
    if (!recording) return fail(res, 400, "No active recording");

    meeting.isRecording = false;
    meeting.isRecordingPaused = false;
    await meeting.save();

    req.app.get("io")?.to(roomId).emit("recording-stopped", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({
      success: true,
      message: "Recording stopped. Ab file upload karo.",
      recordingId: recording._id,
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ---------- UPLOAD ----------
   PUT /local-recording/upload/:recordingId?ext=webm&duration=123&part=1&final=1
   Body: raw video file (Content-Type: video/webm). Seedha Bunny par stream hoti hai. */
exports.uploadLocalRecording = async (req, res) => {
  let recording;

  try {
    recording = await Recording.findById(req.params.recordingId);

    if (!recording || recording.source !== "local") {
      return fail(res, 404, "Recording not found");
    }
    if (recording.startedBy.toString() !== req.user.id) {
      return fail(res, 403, "Only the host can upload this recording");
    }
    if (recording.status === "uploaded") {
      return fail(res, 400, "Recording already uploaded");
    }

    const size = Number(req.headers["content-length"] || 0);
    if (!size) return fail(res, 411, "Content-Length required");
    if (size > MAX_UPLOAD_MB * 1024 * 1024) {
      return fail(res, 413, `File too large (max ${MAX_UPLOAD_MB} MB)`);
    }

    const ext = ["webm", "mp4"].includes(req.query.ext) ? req.query.ext : "webm";
    const duration = Number(req.query.duration) || 0;

    // Flutter me pause/resume par recording kai parts me banti hai.
    // part = kaun sa part, final=0 matlab aur parts aane baaki hain. Web ke liye default final=1.
    const part = Number(req.query.part) || 1;
    const isFinal = req.query.final !== "0";

    // Random naam: link guess nahi kiya ja sakta
    const fileName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}-p${part}.${ext}`;
    const bunnyPath = `recordings/${recording.roomId}/${fileName}`;

    const url = await bunny.uploadFromStream(req, bunnyPath, size);

    recording.files.push({ fileName, bunnyPath, url, size, duration });

    if (isFinal) {
      recording.status = "uploaded";
      recording.stoppedAt = recording.stoppedAt || new Date();
      recording.error = null;

      // Agar host ne stop endpoint nahi chalaya to flags saaf kar do
      await Meeting.updateOne(
        { _id: recording.meetingId },
        { isRecording: false, isRecordingPaused: false }
      );
    }

    await recording.save();

    res.status(200).json({
      success: true,
      message: "Recording uploaded",
      recordingId: recording._id,
      url, // is part ka link
      urls: recording.files.map((f) => f.url), // ab tak ke saare parts
      part,
      final: isFinal,
      size,
      duration,
    });
  } catch (error) {
    console.error("LOCAL UPLOAD ERROR:", error.response?.data || error);

    if (recording) {
      await Recording.updateOne(
        { _id: recording._id },
        { status: "failed", error: error.message }
      );
    }

    if (!res.headersSent) fail(res, 500, error.message);
  }
};