const Recording = require("../models/Recording");
const Meeting = require("../models/Meeting");
const bunnyService = require("../services/bunnyService");
const path = require("path");

// ─── Upload Recording ────────────────────────────────────
exports.uploadRecording = async (req, res) => {
  let recording = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Recording file required hai",
      });
    }

    const { roomId, duration } = req.body;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId required hai",
      });
    }

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const ext = path.extname(req.file.originalname) || ".webm";
    const fileName = `${roomId}_${req.user.id}_${Date.now()}${ext}`;

    // ✅ Step 1 — DB mein "uploading" status se save karo
    recording = await Recording.create({
      meetingId: meeting._id,
      roomId,
      uploadedBy: req.user.id,
      fileName,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      duration: duration ? parseInt(duration) : 0,
      mimeType: req.file.mimetype,
      cdnUrl: "",
      bunnyPath: "",
      status: "uploading",
    });

    console.log("📤 Bunny upload shuru:", fileName);

    // ✅ Step 2 — Bunny par upload karo
    let bunnyResult;
    try {
      bunnyResult = await bunnyService.uploadToBunny(
        req.file.buffer,
        fileName,
        req.file.mimetype
      );
      console.log("✅ Bunny upload success:", bunnyResult.cdnUrl);
    } catch (bunnyError) {
      // Bunny fail — DB mein failed mark karo
      if (recording) {
        recording.status = "failed";
        await recording.save();
      }
      console.log("❌ Bunny upload fail:", bunnyError.message);
      return res.status(500).json({
        success: false,
        message: "Bunny CDN upload fail hua: " + bunnyError.message,
      });
    }

    // ✅ Step 3 — Bunny success — DB update karo
    recording.cdnUrl = bunnyResult.cdnUrl;
    recording.bunnyPath = bunnyResult.bunnyPath;
    recording.status = "ready";
    await recording.save();

    res.status(201).json({
      success: true,
      message: "Recording upload ho gayi",
      recording: {
        _id: recording._id,
        roomId: recording.roomId,
        fileName: recording.fileName,
        originalName: recording.originalName,
        fileSize: recording.fileSize,
        duration: recording.duration,
        mimeType: recording.mimeType,
        cdnUrl: recording.cdnUrl,
        status: recording.status,
        createdAt: recording.createdAt,
      },
    });

  } catch (error) {
    // Koi bhi unexpected error — failed mark karo
    if (recording) {
      recording.status = "failed";
      await recording.save();
    }
    console.log("UPLOAD RECORDING ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get Meeting Recordings ──────────────────────────────
exports.getMeetingRecordings = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ roomId });

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: "Meeting not found",
      });
    }

    const recordings = await Recording.find({
      meetingId: meeting._id,
      status: { $nin: ["deleted", "failed"] },
    })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalRecordings: recordings.length,
      recordings: recordings.map((r) => ({
        _id: r._id,
        roomId: r.roomId,
        fileName: r.fileName,
        originalName: r.originalName,
        fileSize: r.fileSize,
        duration: r.duration,
        mimeType: r.mimeType,
        cdnUrl: r.cdnUrl,
        status: r.status,
        uploadedBy: r.uploadedBy,
        createdAt: r.createdAt,
      })),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get My Recordings ───────────────────────────────────
exports.getMyRecordings = async (req, res) => {
  try {
    const recordings = await Recording.find({
      uploadedBy: req.user.id,
      status: { $nin: ["deleted", "failed"] },
    })
      .populate("meetingId", "roomId title status")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      totalRecordings: recordings.length,
      recordings: recordings.map((r) => ({
        _id: r._id,
        roomId: r.roomId,
        fileName: r.fileName,
        originalName: r.originalName,
        fileSize: r.fileSize,
        duration: r.duration,
        mimeType: r.mimeType,
        cdnUrl: r.cdnUrl,
        status: r.status,
        meeting: r.meetingId,
        createdAt: r.createdAt,
      })),
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get Single Recording ────────────────────────────────
exports.getRecordingById = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id)
      .populate("uploadedBy", "name email")
      .populate("meetingId", "roomId title status");

    if (!recording || recording.status === "deleted") {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    res.status(200).json({
      success: true,
      recording: {
        _id: recording._id,
        roomId: recording.roomId,
        fileName: recording.fileName,
        originalName: recording.originalName,
        fileSize: recording.fileSize,
        duration: recording.duration,
        mimeType: recording.mimeType,
        cdnUrl: recording.cdnUrl,
        status: recording.status,
        uploadedBy: recording.uploadedBy,
        meeting: recording.meetingId,
        createdAt: recording.createdAt,
      },
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Download Recording ──────────────────────────────────
exports.downloadRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    if (recording.status === "deleted") {
      return res.status(404).json({
        success: false,
        message: "Recording delete ho chuki hai",
      });
    }

    if (recording.status !== "ready") {
      return res.status(400).json({
        success: false,
        message: "Recording abhi ready nahi hai",
      });
    }

    // Bunny se stream karo
    const fileStream = await bunnyService.getFileStream(recording.bunnyPath);

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${recording.originalName}"`
    );
    res.setHeader("Content-Type", recording.mimeType);

    fileStream.data.pipe(res);

  } catch (error) {
    console.log("DOWNLOAD ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Delete Recording ────────────────────────────────────
exports.deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.id);

    if (!recording) {
      return res.status(404).json({
        success: false,
        message: "Recording not found",
      });
    }

    if (recording.status === "deleted") {
      return res.status(400).json({
        success: false,
        message: "Recording pehle se delete hai",
      });
    }

    const meeting = await Meeting.findOne({ roomId: recording.roomId });

    const isUploader = recording.uploadedBy.toString() === req.user.id;
    const isHost = meeting?.hostId.toString() === req.user.id;

    if (!isUploader && !isHost) {
      return res.status(403).json({
        success: false,
        message: "Sirf uploader ya host delete kar sakta hai",
      });
    }

    // Bunny se delete karo — agar bunnyPath hai to
    if (recording.bunnyPath) {
      try {
        await bunnyService.deleteFromBunny(recording.bunnyPath);
        console.log("✅ Bunny se delete hua:", recording.bunnyPath);
      } catch (bunnyError) {
        console.log("⚠️ Bunny delete fail (DB se toh delete karenge):", bunnyError.message);
      }
    }

    recording.status = "deleted";
    await recording.save();

    res.status(200).json({
      success: true,
      message: "Recording delete ho gayi",
    });

  } catch (error) {
    console.log("DELETE RECORDING ERROR:", error.message);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};