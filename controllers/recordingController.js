// const crypto = require("crypto");
// const Meeting = require("../models/Meeting");
// const Recording = require("../models/Recording");
// const User = require("../models/User");
// const bunny = require("../services/bunnyService");

// const MAX_UPLOAD_MB = Number(process.env.MAX_RECORDING_MB || 1024);

// // Stop ke 15 min baad bhi upload nahi hua to admin ko "stalled" dikhega
// const STALLED_AFTER_MS = 15 * 60 * 1000;

// /* =====================================================
//    HELPERS
// ===================================================== */

// const fail = (res, code, message) =>
//   res.status(code).json({ success: false, message });

// const emit = (req, roomId, event, payload) =>
//   req.app.get("io")?.to(roomId).emit(event, payload);

// const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// const clearMeetingFlags = (meetingId) =>
//   Meeting.updateOne(
//     { _id: meetingId },
//     { isRecording: false, isRecordingPaused: false }
//   );

// /** Meeting dhundo + host check. Return: { meeting } ya { error: { code, message } } */
// const getHostMeeting = async (roomId, userId, action) => {
//   if (!roomId) {
//     return { error: { code: 400, message: "roomId is required" } };
//   }

//   const meeting = await Meeting.findOne({ roomId });

//   if (!meeting) {
//     return { error: { code: 404, message: "Meeting not found" } };
//   }

//   if (meeting.hostId.toString() !== userId) {
//     return {
//       error: { code: 403, message: `Only host can ${action} recording` },
//     };
//   }

//   return { meeting };
// };

// /**
//  * Meeting end hone par meetingController isse call karta hai.
//  * Chal rahi ya paused recording ko "processing" me daal deta hai.
//  * (File upload host ka device karta hai.)
//  */
// const stopRecordingForRoom = async (meeting, io) => {
//   const recording = await Recording.findOneAndUpdate(
//     { meetingId: meeting._id, status: { $in: ["recording", "paused"] } },
//     { status: "processing", stoppedAt: new Date() },
//     { new: true, sort: { createdAt: -1 } }
//   );

//   if (meeting.isRecording || meeting.isRecordingPaused) {
//     meeting.isRecording = false;
//     meeting.isRecordingPaused = false;
//     await meeting.save();
//   }

//   if (recording) {
//     io?.to(meeting.roomId).emit("recording-stopped", {
//       roomId: meeting.roomId,
//       recordingId: recording._id,
//     });
//   }

//   return recording;
// };

// exports.stopRecordingForRoom = stopRecordingForRoom;

// /* ---------- Upload ke shared helpers ---------- */

// // Query params + size validation
// const readUploadParams = (req) => {
//   const size = Number(req.headers["content-length"] || 0);

//   if (!size) {
//     return { error: { code: 411, message: "Content-Length required" } };
//   }

//   if (size > MAX_UPLOAD_MB * 1024 * 1024) {
//     return {
//       error: { code: 413, message: `File too large (max ${MAX_UPLOAD_MB} MB)` },
//     };
//   }

//   return {
//     size,
//     ext: ["webm", "mp4"].includes(req.query.ext) ? req.query.ext : "webm",
//     duration: Number(req.query.duration) || 0,
//     part: Number(req.query.part) || 1, // pause/resume par 1, 2, 3...
//     isFinal: req.query.final !== "0", // 0 = aur parts aane baaki hain
//   };
// };

// // Body (raw video) ko seedha Bunny par stream karo + DB me save karo
// const storePart = async (req, recording, params) => {
//   const { size, ext, duration, part, isFinal } = params;

//   // Random naam: link guess nahi kiya ja sakta
//   const fileName = `${Date.now()}-${crypto
//     .randomBytes(8)
//     .toString("hex")}-p${part}.${ext}`;
//   const bunnyPath = `recordings/${recording.roomId}/${fileName}`;

//   const url = await bunny.uploadFromStream(req, bunnyPath, size);

//   recording.files.push({ part, fileName, bunnyPath, url, size, duration });

//   if (isFinal) {
//     recording.status = "uploaded";
//     recording.stoppedAt = recording.stoppedAt || new Date();
//     recording.error = null;
//   }

//   await recording.save();

//   if (isFinal) await clearMeetingFlags(recording.meetingId);

//   const urls = [...recording.files]
//     .sort((a, b) => a.part - b.part)
//     .map((f) => f.url);

//   return { url, urls };
// };

// const markUploadFailed = (recording, error) =>
//   Recording.updateOne(
//     { _id: recording._id },
//     { status: "failed", error: error.message }
//   ).catch(() => {});

// /**
//  * Recording ki saari files Bunny se delete karo.
//  * Jo file delete na ho paaye wo recording.files me rakhi jaati hain (taaki retry ho sake).
//  * Return: true agar sab delete ho gayi.
//  */
// const purgeBunnyFiles = async (recording) => {
//   const remaining = [];

//   for (const f of recording.files) {
//     if (!f.bunnyPath) continue;

//     try {
//       await bunny.deleteFile(f.bunnyPath); // 404 ko success maana jaata hai
//     } catch (e) {
//       console.error("Bunny delete failed:", f.bunnyPath, e.message);
//       remaining.push(f.toObject());
//     }
//   }

//   if (remaining.length > 0) {
//     recording.set("files", remaining);
//     await recording.save();
//     return false;
//   }

//   return true;
// };

// /* =====================================================
//    START
// ===================================================== */
// exports.startRecording = async (req, res) => {
//   try {
//     const { roomId } = req.body;

//     const { meeting, error } = await getHostMeeting(roomId, req.user.id, "start");
//     if (error) return fail(res, error.code, error.message);

//     if (meeting.status === "ended") {
//       return fail(res, 400, "Meeting has ended");
//     }

//     // Atomic lock: ek time par ek hi recording
//     const locked = await Meeting.findOneAndUpdate(
//       { _id: meeting._id, isRecording: false },
//       { isRecording: true, isRecordingPaused: false }
//     );

//     if (!locked) {
//       return fail(res, 400, "Recording already in progress");
//     }

//     let recording;
//     try {
//       recording = await Recording.create({
//         meetingId: meeting._id,
//         roomId,
//         startedBy: req.user.id,
//         status: "recording",
//       });
//     } catch (e) {
//       await Meeting.updateOne({ _id: meeting._id }, { isRecording: false });
//       throw e;
//     }

//     emit(req, roomId, "recording-started", {
//       roomId,
//       recordingId: recording._id,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Recording started",
//       recordingId: recording._id,
//     });
//   } catch (error) {
//     console.error("START RECORDING ERROR:", error);
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    PAUSE
// ===================================================== */
// exports.pauseRecording = async (req, res) => {
//   try {
//     const { roomId } = req.body;

//     const { meeting, error } = await getHostMeeting(roomId, req.user.id, "pause");
//     if (error) return fail(res, error.code, error.message);

//     const recording = await Recording.findOneAndUpdate(
//       { meetingId: meeting._id, status: "recording" },
//       { status: "paused" },
//       { new: true, sort: { createdAt: -1 } }
//     );

//     if (!recording) {
//       return fail(res, 400, "No active recording to pause");
//     }

//     meeting.isRecordingPaused = true;
//     await meeting.save();

//     emit(req, roomId, "recording-paused", {
//       roomId,
//       recordingId: recording._id,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Recording paused",
//       recordingId: recording._id,
//     });
//   } catch (error) {
//     console.error("PAUSE RECORDING ERROR:", error);
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    RESUME
// ===================================================== */
// exports.resumeRecording = async (req, res) => {
//   try {
//     const { roomId } = req.body;

//     const { meeting, error } = await getHostMeeting(roomId, req.user.id, "resume");
//     if (error) return fail(res, error.code, error.message);

//     if (meeting.status === "ended") {
//       return fail(res, 400, "Meeting has ended");
//     }

//     const recording = await Recording.findOneAndUpdate(
//       { meetingId: meeting._id, status: "paused" },
//       { status: "recording" },
//       { new: true, sort: { createdAt: -1 } }
//     );

//     if (!recording) {
//       return fail(res, 400, "Recording is not paused");
//     }

//     meeting.isRecordingPaused = false;
//     await meeting.save();

//     emit(req, roomId, "recording-resumed", {
//       roomId,
//       recordingId: recording._id,
//     });

//     res.status(200).json({
//       success: true,
//       message: "Recording resumed",
//       recordingId: recording._id,
//     });
//   } catch (error) {
//     console.error("RESUME RECORDING ERROR:", error);
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    STOP (sirf state "processing" karta hai, file upload nahi)
//    Automatic flow ke liye neeche wala stop-upload endpoint use karo.
// ===================================================== */
// exports.stopRecording = async (req, res) => {
//   try {
//     const { roomId } = req.body;

//     const { meeting, error } = await getHostMeeting(roomId, req.user.id, "stop");
//     if (error) return fail(res, error.code, error.message);

//     const recording = await stopRecordingForRoom(meeting, req.app.get("io"));

//     if (!recording) {
//       return fail(res, 400, "No active recording");
//     }

//     res.status(200).json({
//       success: true,
//       message: "Recording stopped. Ab file upload karo.",
//       recordingId: recording._id,
//     });
//   } catch (error) {
//     console.error("STOP RECORDING ERROR:", error);
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    UPLOAD
//    PUT /local-recording/upload/:recordingId?ext=mp4&duration=60&part=1&final=1
//    Body: raw video file. Recording pehle stop ho chuki honi chahiye.
// ===================================================== */
// exports.uploadRecording = async (req, res) => {
//   let recording;

//   try {
//     recording = await Recording.findById(req.params.recordingId);

//     if (!recording) {
//       return fail(res, 404, "Recording not found");
//     }

//     if (recording.startedBy.toString() !== req.user.id) {
//       return fail(res, 403, "Only the host can upload this recording");
//     }

//     if (recording.status === "uploaded") {
//       return fail(res, 400, "Recording already uploaded");
//     }

//     if (recording.status === "recording" || recording.status === "paused") {
//       return fail(res, 400, "Pehle recording stop karo, phir upload karo");
//     }

//     const params = readUploadParams(req);
//     if (params.error) return fail(res, params.error.code, params.error.message);

//     const { url, urls } = await storePart(req, recording, params);

//     res.status(200).json({
//       success: true,
//       message: params.isFinal ? "Recording uploaded" : "Part uploaded",
//       recordingId: recording._id,
//       url,
//       urls,
//       part: params.part,
//       final: params.isFinal,
//       size: params.size,
//       duration: params.duration,
//     });
//   } catch (error) {
//     console.error("UPLOAD RECORDING ERROR:", error.response?.data || error);
//     if (recording) await markUploadFailed(recording, error);
//     if (!res.headersSent) fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    STOP + UPLOAD (ek hi call me)  <-- AUTOMATIC FLOW

//    PUT /local-recording/stop-upload/:recordingId?ext=webm&duration=123&part=1&final=1
//    Body: raw video file

//    Host jaise hi Stop dabaye, app/browser file bante hi isi endpoint par bhej de:
//    1. Recording "recording/paused" ho to pehle stop hoti hai
//    2. File seedha Bunny par stream hoti hai
//    3. Status "uploaded" ho jaata hai aur Bunny ka link response me aata hai

//    Upload fail ho jaye to status "failed" hota hai, isi endpoint ko dobara
//    call karke retry kar sakte ho (file host ke device par hai).
// ===================================================== */
// exports.stopAndUploadRecording = async (req, res) => {
//   let recording;

//   try {
//     recording = await Recording.findById(req.params.recordingId);

//     if (!recording) {
//       return fail(res, 404, "Recording not found");
//     }

//     const meeting = await Meeting.findById(recording.meetingId);

//     const isOwner = recording.startedBy.toString() === req.user.id;
//     const isHost = meeting && meeting.hostId.toString() === req.user.id;

//     if (!isOwner && !isHost) {
//       return fail(res, 403, "Only the host can upload this recording");
//     }

//     if (recording.status === "uploaded") {
//       return fail(res, 400, "Recording already uploaded");
//     }

//     // Pehle validate karo, tab hi stop karo
//     const params = readUploadParams(req);
//     if (params.error) return fail(res, params.error.code, params.error.message);

//     // Step 1: abhi chal rahi ya paused hai to stop karo
//     if (recording.status === "recording" || recording.status === "paused") {
//       recording.status = "processing";
//       recording.stoppedAt = new Date();
//       await recording.save();

//       await clearMeetingFlags(recording.meetingId);

//       emit(req, recording.roomId, "recording-stopped", {
//         roomId: recording.roomId,
//         recordingId: recording._id,
//       });
//     }

//     // Step 2: Bunny par upload
//     const { url, urls } = await storePart(req, recording, params);

//     res.status(200).json({
//       success: true,
//       message: params.isFinal ? "Recording saved" : "Part saved",
//       recordingId: recording._id,
//       status: recording.status,
//       url,
//       urls,
//       part: params.part,
//       final: params.isFinal,
//       size: params.size,
//       duration: params.duration,
//     });
//   } catch (error) {
//     console.error("STOP-UPLOAD ERROR:", error.response?.data || error);
//     if (recording) await markUploadFailed(recording, error);
//     if (!res.headersSent) fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    STATUS (frontend button state ke liye)
// ===================================================== */
// exports.getRecordingStatus = async (req, res) => {
//   try {
//     const meeting = await Meeting.findOne({ roomId: req.params.roomId });

//     if (!meeting) {
//       return fail(res, 404, "Meeting not found");
//     }

//     let state = "idle";
//     if (meeting.isRecording && meeting.isRecordingPaused) state = "paused";
//     else if (meeting.isRecording) state = "recording";

//     res.status(200).json({
//       success: true,
//       state, // idle | recording | paused
//       isRecording: meeting.isRecording,
//       isRecordingPaused: meeting.isRecordingPaused,
//       autoRecord: meeting.autoRecord,
//     });
//   } catch (error) {
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    LIST (host)
// ===================================================== */
// exports.getRoomRecordings = async (req, res) => {
//   try {
//     const meeting = await Meeting.findOne({ roomId: req.params.roomId });

//     if (!meeting) {
//       return fail(res, 404, "Meeting not found");
//     }

//     if (meeting.hostId.toString() !== req.user.id) {
//       return fail(res, 403, "Only host can view recordings");
//     }

//     const recordings = await Recording.find({
//       meetingId: meeting._id,
//     }).sort({ createdAt: -1 });

//     res.status(200).json({ success: true, recordings });
//   } catch (error) {
//     fail(res, 500, error.message);
//   }
// };

// exports.getMyRecordings = async (req, res) => {
//   try {
//     const recordings = await Recording.find({
//       startedBy: req.user.id,
//       status: { $in: ["processing", "uploaded"] },
//     }).sort({ createdAt: -1 });

//     res.status(200).json({ success: true, recordings });
//   } catch (error) {
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    DELETE (host / recording banane wala)
//    Bunny se files delete hoti hain, tab hi DB record hatta hai.
//    Bunny delete fail ho to record rehta hai, dobara try kar sakte ho.
// ===================================================== */
// exports.deleteRecording = async (req, res) => {
//   try {
//     const recording = await Recording.findById(req.params.recordingId);

//     if (!recording) {
//       return fail(res, 404, "Recording not found");
//     }

//     const meeting = await Meeting.findById(recording.meetingId);

//     const isOwner = recording.startedBy.toString() === req.user.id;
//     const isHost = meeting && meeting.hostId.toString() === req.user.id;

//     if (!isOwner && !isHost) {
//       return fail(res, 403, "Not allowed to delete this recording");
//     }

//     if (recording.status === "recording" || recording.status === "paused") {
//       return fail(res, 400, "Recording abhi chal rahi hai, pehle stop karo");
//     }

//     const allDeleted = await purgeBunnyFiles(recording);

//     if (!allDeleted) {
//       return fail(
//         res,
//         502,
//         "Bunny se kuch files delete nahi ho payi. Thodi der baad dobara try karo."
//       );
//     }

//     await recording.deleteOne();

//     res.status(200).json({ success: true, message: "Recording deleted" });
//   } catch (error) {
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    ADMIN: saari recordings
//    GET /admin/recordings?page=1&limit=10&status=all|recording|paused|processing|uploaded|failed&search=abc
// ===================================================== */
// exports.getAdminRecordings = async (req, res) => {
//   try {
//     const page = Math.max(1, parseInt(req.query.page, 10) || 1);
//     const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
//     const status = req.query.status;
//     const search = (req.query.search || "").trim();

//     const query = {};

//     if (status && status !== "all") {
//       query.status = status;
//     }

//     // Search: meeting code, ya recording shuru karne wale ka naam/email
//     if (search) {
//       const rx = new RegExp(escapeRegex(search), "i");

//       const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
//         .select("_id")
//         .limit(100);

//       query.$or = [{ roomId: rx }, { startedBy: { $in: users.map((u) => u._id) } }];
//     }

//     const [total, recordings, statusAgg, totalsAgg] = await Promise.all([
//       Recording.countDocuments(query),

//       Recording.find(query)
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(limit)
//         .populate("startedBy", "name email phone")
//         .populate({
//           path: "meetingId",
//           select: "title status hostId",
//           populate: { path: "hostId", select: "name email" },
//         }),

//       // Tabs ke counts (filter ka asar nahi padta)
//       Recording.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

//       // Total storage + total recorded length
//       Recording.aggregate([
//         { $unwind: "$files" },
//         {
//           $group: {
//             _id: null,
//             totalSize: { $sum: "$files.size" },
//             totalDuration: { $sum: "$files.duration" },
//             totalFiles: { $sum: 1 },
//           },
//         },
//       ]),
//     ]);

//     const counts = {
//       recording: 0,
//       paused: 0,
//       processing: 0,
//       uploaded: 0,
//       failed: 0,
//     };
//     statusAgg.forEach((s) => {
//       counts[s._id] = s.count;
//     });

//     const totals = totalsAgg[0] || {};
//     const now = Date.now();

//     const rows = recordings.map((r) => {
//       const files = [...r.files]
//         .sort((a, b) => a.part - b.part)
//         .map((f) => ({
//           part: f.part,
//           fileName: f.fileName,
//           url: f.url,
//           size: f.size || 0,
//           duration: f.duration || 0,
//         }));

//       return {
//         recordingId: r._id,
//         roomId: r.roomId,
//         title: r.meetingId?.title || "–",
//         meetingStatus: r.meetingId?.status || null,
//         host: r.meetingId?.hostId || null,
//         startedBy: r.startedBy,
//         status: r.status,
//         // Stop ho gayi par file 15+ min se upload nahi hui
//         stalled:
//           r.status === "processing" &&
//           r.stoppedAt &&
//           now - new Date(r.stoppedAt).getTime() > STALLED_AFTER_MS,
//         error: r.error,
//         startedAt: r.startedAt,
//         stoppedAt: r.stoppedAt,
//         partsCount: files.length,
//         totalSize: files.reduce((s, f) => s + f.size, 0),
//         totalDuration: files.reduce((s, f) => s + f.duration, 0),
//         files,
//       };
//     });

//     res.status(200).json({
//       success: true,
//       stats: {
//         total: Object.values(counts).reduce((a, b) => a + b, 0),
//         ...counts,
//         totalSize: totals.totalSize || 0, // bytes
//         totalDuration: totals.totalDuration || 0, // seconds
//         totalFiles: totals.totalFiles || 0,
//       },
//       pagination: {
//         page,
//         limit,
//         total,
//         totalPages: Math.max(1, Math.ceil(total / limit)),
//       },
//       recordings: rows,
//     });
//   } catch (error) {
//     console.error("ADMIN RECORDINGS ERROR:", error);
//     fail(res, 500, error.message);
//   }
// };

// /* =====================================================
//    ADMIN: recording delete (Bunny + DB)
//    DELETE /admin/recordings/:recordingId
//    ?force=true  -> atki hui "recording/paused" recording bhi delete ho jaati hai
// ===================================================== */
// exports.adminDeleteRecording = async (req, res) => {
//   try {
//     const recording = await Recording.findById(req.params.recordingId);

//     if (!recording) {
//       return fail(res, 404, "Recording not found");
//     }

//     const isLive =
//       recording.status === "recording" || recording.status === "paused";

//     if (isLive && req.query.force !== "true") {
//       return fail(
//         res,
//         400,
//         "Recording abhi chal rahi hai. Force delete ke liye ?force=true use karo."
//       );
//     }

//     const allDeleted = await purgeBunnyFiles(recording);

//     if (!allDeleted) {
//       return fail(
//         res,
//         502,
//         "Bunny se kuch files delete nahi ho payi. Thodi der baad dobara try karo."
//       );
//     }

//     await recording.deleteOne();

//     // Force delete me meeting ke recording flags bhi saaf karo
//     if (isLive) await clearMeetingFlags(recording.meetingId);

//     res.status(200).json({ success: true, message: "Recording deleted" });
//   } catch (error) {
//     console.error("ADMIN DELETE RECORDING ERROR:", error);
//     fail(res, 500, error.message);
//   }
// };

const crypto = require("crypto");
const Meeting = require("../models/Meeting");
const Recording = require("../models/Recording");
const User = require("../models/User");
const bunny = require("../services/bunnyService");

// Sirf audio recording. Audio chhoti hoti hai, isliye default limit 300 MB
const MAX_UPLOAD_MB = Number(process.env.MAX_RECORDING_MB || 300);

const AUDIO_CONTENT_TYPES = {
  webm: "audio/webm",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  aac: "audio/aac",
};
const AUDIO_EXTS = Object.keys(AUDIO_CONTENT_TYPES);

// Stop ke 15 min baad bhi upload nahi hua to admin ko "stalled" dikhega
const STALLED_AFTER_MS = 15 * 60 * 1000;

/* =====================================================
   HELPERS
===================================================== */

const fail = (res, code, message) =>
  res.status(code).json({ success: false, message });

const emit = (req, roomId, event, payload) =>
  req.app.get("io")?.to(roomId).emit(event, payload);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const clearMeetingFlags = (meetingId) =>
  Meeting.updateOne(
    { _id: meetingId },
    { isRecording: false, isRecordingPaused: false }
  );

/** Meeting dhundo + host check. Return: { meeting } ya { error: { code, message } } */
const getHostMeeting = async (roomId, userId, action) => {
  if (!roomId) {
    return { error: { code: 400, message: "roomId is required" } };
  }

  const meeting = await Meeting.findOne({ roomId });

  if (!meeting) {
    return { error: { code: 404, message: "Meeting not found" } };
  }

  if (meeting.hostId.toString() !== userId) {
    return {
      error: { code: 403, message: `Only host can ${action} recording` },
    };
  }

  return { meeting };
};

/**
 * Meeting end hone par meetingController isse call karta hai.
 * Chal rahi ya paused recording ko "processing" me daal deta hai.
 * (File upload host ka device karta hai.)
 */
const stopRecordingForRoom = async (meeting, io) => {
  const recording = await Recording.findOneAndUpdate(
    { meetingId: meeting._id, status: { $in: ["recording", "paused"] } },
    { status: "processing", stoppedAt: new Date() },
    { new: true, sort: { createdAt: -1 } }
  );

  if (meeting.isRecording || meeting.isRecordingPaused) {
    meeting.isRecording = false;
    meeting.isRecordingPaused = false;
    await meeting.save();
  }

  if (recording) {
    io?.to(meeting.roomId).emit("recording-stopped", {
      roomId: meeting.roomId,
      recordingId: recording._id,
    });
  }

  return recording;
};

exports.stopRecordingForRoom = stopRecordingForRoom;

/* ---------- Upload ke shared helpers ---------- */

// Query params + size validation
const readUploadParams = (req) => {
  // Video file aaye to reject (audio/* aur application/octet-stream allowed)
  const contentType = String(req.headers["content-type"] || "").toLowerCase();

  if (contentType.startsWith("video/")) {
    return {
      error: { code: 415, message: "Sirf audio recording allowed hai" },
    };
  }

  const size = Number(req.headers["content-length"] || 0);

  if (!size) {
    return { error: { code: 411, message: "Content-Length required" } };
  }

  if (size > MAX_UPLOAD_MB * 1024 * 1024) {
    return {
      error: { code: 413, message: `File too large (max ${MAX_UPLOAD_MB} MB)` },
    };
  }

  return {
    size,
    ext: AUDIO_EXTS.includes(req.query.ext) ? req.query.ext : "webm",
    duration: Number(req.query.duration) || 0,
    part: Number(req.query.part) || 1, // pause/resume par 1, 2, 3...
    isFinal: req.query.final !== "0", // 0 = aur parts aane baaki hain
  };
};

// Body (raw video) ko seedha Bunny par stream karo + DB me save karo
const storePart = async (req, recording, params) => {
  const { size, ext, duration, part, isFinal } = params;

  // Random naam: link guess nahi kiya ja sakta
  const fileName = `${Date.now()}-${crypto
    .randomBytes(8)
    .toString("hex")}-p${part}.${ext}`;
  const bunnyPath = `recordings/${recording.roomId}/${fileName}`;

  const url = await bunny.uploadFromStream(
    req,
    bunnyPath,
    size,
    AUDIO_CONTENT_TYPES[ext] || "application/octet-stream"
  );

  recording.files.push({ part, fileName, bunnyPath, url, size, duration });

  if (isFinal) {
    recording.status = "uploaded";
    recording.stoppedAt = recording.stoppedAt || new Date();
    recording.error = null;
  }

  await recording.save();

  if (isFinal) await clearMeetingFlags(recording.meetingId);

  const urls = [...recording.files]
    .sort((a, b) => a.part - b.part)
    .map((f) => f.url);

  return { url, urls };
};

const markUploadFailed = (recording, error) =>
  Recording.updateOne(
    { _id: recording._id },
    { status: "failed", error: error.message }
  ).catch(() => {});

/**
 * Recording ki saari files Bunny se delete karo.
 * Jo file delete na ho paaye wo recording.files me rakhi jaati hain (taaki retry ho sake).
 * Return: true agar sab delete ho gayi.
 */
const purgeBunnyFiles = async (recording) => {
  const remaining = [];

  for (const f of recording.files) {
    if (!f.bunnyPath) continue;

    try {
      await bunny.deleteFile(f.bunnyPath); // 404 ko success maana jaata hai
    } catch (e) {
      console.error("Bunny delete failed:", f.bunnyPath, e.message);
      remaining.push(f.toObject());
    }
  }

  if (remaining.length > 0) {
    recording.set("files", remaining);
    await recording.save();
    return false;
  }

  return true;
};

/* =====================================================
   START
===================================================== */
exports.startRecording = async (req, res) => {
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

    if (!locked) {
      return fail(res, 400, "Recording already in progress");
    }

    let recording;
    try {
      recording = await Recording.create({
        meetingId: meeting._id,
        roomId,
        startedBy: req.user.id,
        status: "recording",
      });
    } catch (e) {
      await Meeting.updateOne({ _id: meeting._id }, { isRecording: false });
      throw e;
    }

    emit(req, roomId, "recording-started", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({
      success: true,
      message: "Recording started",
      recordingId: recording._id,
    });
  } catch (error) {
    console.error("START RECORDING ERROR:", error);
    fail(res, 500, error.message);
  }
};

/* =====================================================
   PAUSE
===================================================== */
exports.pauseRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "pause");
    if (error) return fail(res, error.code, error.message);

    const recording = await Recording.findOneAndUpdate(
      { meetingId: meeting._id, status: "recording" },
      { status: "paused" },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!recording) {
      return fail(res, 400, "No active recording to pause");
    }

    meeting.isRecordingPaused = true;
    await meeting.save();

    emit(req, roomId, "recording-paused", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({
      success: true,
      message: "Recording paused",
      recordingId: recording._id,
    });
  } catch (error) {
    console.error("PAUSE RECORDING ERROR:", error);
    fail(res, 500, error.message);
  }
};

/* =====================================================
   RESUME
===================================================== */
exports.resumeRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "resume");
    if (error) return fail(res, error.code, error.message);

    if (meeting.status === "ended") {
      return fail(res, 400, "Meeting has ended");
    }

    const recording = await Recording.findOneAndUpdate(
      { meetingId: meeting._id, status: "paused" },
      { status: "recording" },
      { new: true, sort: { createdAt: -1 } }
    );

    if (!recording) {
      return fail(res, 400, "Recording is not paused");
    }

    meeting.isRecordingPaused = false;
    await meeting.save();

    emit(req, roomId, "recording-resumed", {
      roomId,
      recordingId: recording._id,
    });

    res.status(200).json({
      success: true,
      message: "Recording resumed",
      recordingId: recording._id,
    });
  } catch (error) {
    console.error("RESUME RECORDING ERROR:", error);
    fail(res, 500, error.message);
  }
};

/* =====================================================
   STOP (sirf state "processing" karta hai, file upload nahi)
   Automatic flow ke liye neeche wala stop-upload endpoint use karo.
===================================================== */
exports.stopRecording = async (req, res) => {
  try {
    const { roomId } = req.body;

    const { meeting, error } = await getHostMeeting(roomId, req.user.id, "stop");
    if (error) return fail(res, error.code, error.message);

    const recording = await stopRecordingForRoom(meeting, req.app.get("io"));

    if (!recording) {
      return fail(res, 400, "No active recording");
    }

    res.status(200).json({
      success: true,
      message: "Recording stopped. Ab file upload karo.",
      recordingId: recording._id,
    });
  } catch (error) {
    console.error("STOP RECORDING ERROR:", error);
    fail(res, 500, error.message);
  }
};

/* =====================================================
   UPLOAD
   PUT /local-recording/upload/:recordingId?ext=mp4&duration=60&part=1&final=1
   Body: raw audio file. Recording pehle stop ho chuki honi chahiye.
===================================================== */
exports.uploadRecording = async (req, res) => {
  let recording;

  try {
    recording = await Recording.findById(req.params.recordingId);

    if (!recording) {
      return fail(res, 404, "Recording not found");
    }

    if (recording.startedBy.toString() !== req.user.id) {
      return fail(res, 403, "Only the host can upload this recording");
    }

    if (recording.status === "uploaded") {
      return fail(res, 400, "Recording already uploaded");
    }

    if (recording.status === "recording" || recording.status === "paused") {
      return fail(res, 400, "Pehle recording stop karo, phir upload karo");
    }

    const params = readUploadParams(req);
    if (params.error) return fail(res, params.error.code, params.error.message);

    const { url, urls } = await storePart(req, recording, params);

    res.status(200).json({
      success: true,
      message: params.isFinal ? "Recording uploaded" : "Part uploaded",
      recordingId: recording._id,
      url,
      urls,
      part: params.part,
      final: params.isFinal,
      size: params.size,
      duration: params.duration,
    });
  } catch (error) {
    console.error("UPLOAD RECORDING ERROR:", error.response?.data || error);
    if (recording) await markUploadFailed(recording, error);
    if (!res.headersSent) fail(res, 500, error.message);
  }
};

/* =====================================================
   STOP + UPLOAD (ek hi call me)  <-- AUTOMATIC FLOW

   PUT /local-recording/stop-upload/:recordingId?ext=webm&duration=123&part=1&final=1
   Body: raw audio file (audio/webm, audio/mp4 ...)

   Host jaise hi Stop dabaye, app/browser file bante hi isi endpoint par bhej de:
   1. Recording "recording/paused" ho to pehle stop hoti hai
   2. File seedha Bunny par stream hoti hai
   3. Status "uploaded" ho jaata hai aur Bunny ka link response me aata hai

   Upload fail ho jaye to status "failed" hota hai, isi endpoint ko dobara
   call karke retry kar sakte ho (file host ke device par hai).
===================================================== */
exports.stopAndUploadRecording = async (req, res) => {
  let recording;

  try {
    recording = await Recording.findById(req.params.recordingId);

    if (!recording) {
      return fail(res, 404, "Recording not found");
    }

    const meeting = await Meeting.findById(recording.meetingId);

    const isOwner = recording.startedBy.toString() === req.user.id;
    const isHost = meeting && meeting.hostId.toString() === req.user.id;

    if (!isOwner && !isHost) {
      return fail(res, 403, "Only the host can upload this recording");
    }

    if (recording.status === "uploaded") {
      return fail(res, 400, "Recording already uploaded");
    }

    // Pehle validate karo, tab hi stop karo
    const params = readUploadParams(req);
    if (params.error) return fail(res, params.error.code, params.error.message);

    // Step 1: abhi chal rahi ya paused hai to stop karo
    if (recording.status === "recording" || recording.status === "paused") {
      recording.status = "processing";
      recording.stoppedAt = new Date();
      await recording.save();

      await clearMeetingFlags(recording.meetingId);

      emit(req, recording.roomId, "recording-stopped", {
        roomId: recording.roomId,
        recordingId: recording._id,
      });
    }

    // Step 2: Bunny par upload
    const { url, urls } = await storePart(req, recording, params);

    res.status(200).json({
      success: true,
      message: params.isFinal ? "Recording saved" : "Part saved",
      recordingId: recording._id,
      status: recording.status,
      url,
      urls,
      part: params.part,
      final: params.isFinal,
      size: params.size,
      duration: params.duration,
    });
  } catch (error) {
    console.error("STOP-UPLOAD ERROR:", error.response?.data || error);
    if (recording) await markUploadFailed(recording, error);
    if (!res.headersSent) fail(res, 500, error.message);
  }
};

/* =====================================================
   STATUS (frontend button state ke liye)
===================================================== */
exports.getRecordingStatus = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) {
      return fail(res, 404, "Meeting not found");
    }

    let state = "idle";
    if (meeting.isRecording && meeting.isRecordingPaused) state = "paused";
    else if (meeting.isRecording) state = "recording";

    res.status(200).json({
      success: true,
      state, // idle | recording | paused
      isRecording: meeting.isRecording,
      isRecordingPaused: meeting.isRecordingPaused,
      autoRecord: meeting.autoRecord,
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* =====================================================
   LIST (host)
===================================================== */
exports.getRoomRecordings = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: req.params.roomId });

    if (!meeting) {
      return fail(res, 404, "Meeting not found");
    }

    if (meeting.hostId.toString() !== req.user.id) {
      return fail(res, 403, "Only host can view recordings");
    }

    const recordings = await Recording.find({
      meetingId: meeting._id,
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, recordings });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

exports.getMyRecordings = async (req, res) => {
  try {
    const recordings = await Recording.find({
      startedBy: req.user.id,
      status: { $in: ["processing", "uploaded"] },
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, recordings });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* =====================================================
   DELETE (host / recording banane wala)
   Bunny se files delete hoti hain, tab hi DB record hatta hai.
   Bunny delete fail ho to record rehta hai, dobara try kar sakte ho.
===================================================== */
exports.deleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.recordingId);

    if (!recording) {
      return fail(res, 404, "Recording not found");
    }

    const meeting = await Meeting.findById(recording.meetingId);

    const isOwner = recording.startedBy.toString() === req.user.id;
    const isHost = meeting && meeting.hostId.toString() === req.user.id;

    if (!isOwner && !isHost) {
      return fail(res, 403, "Not allowed to delete this recording");
    }

    if (recording.status === "recording" || recording.status === "paused") {
      return fail(res, 400, "Recording abhi chal rahi hai, pehle stop karo");
    }

    const allDeleted = await purgeBunnyFiles(recording);

    if (!allDeleted) {
      return fail(
        res,
        502,
        "Bunny se kuch files delete nahi ho payi. Thodi der baad dobara try karo."
      );
    }

    await recording.deleteOne();

    res.status(200).json({ success: true, message: "Recording deleted" });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* =====================================================
   ADMIN: saari recordings
   GET /admin/recordings?page=1&limit=10&status=all|recording|paused|processing|uploaded|failed&search=abc
===================================================== */
exports.getAdminRecordings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const status = req.query.status;
    const search = (req.query.search || "").trim();

    const query = {};

    if (status && status !== "all") {
      query.status = status;
    }

    // Search: meeting code, ya recording shuru karne wale ka naam/email
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");

      const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
        .select("_id")
        .limit(100);

      query.$or = [{ roomId: rx }, { startedBy: { $in: users.map((u) => u._id) } }];
    }

    const [total, recordings, statusAgg, totalsAgg] = await Promise.all([
      Recording.countDocuments(query),

      Recording.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("startedBy", "name email phone")
        .populate({
          path: "meetingId",
          select: "title status hostId",
          populate: { path: "hostId", select: "name email" },
        }),

      // Tabs ke counts (filter ka asar nahi padta)
      Recording.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      // Total storage + total recorded length
      Recording.aggregate([
        { $unwind: "$files" },
        {
          $group: {
            _id: null,
            totalSize: { $sum: "$files.size" },
            totalDuration: { $sum: "$files.duration" },
            totalFiles: { $sum: 1 },
          },
        },
      ]),
    ]);

    const counts = {
      recording: 0,
      paused: 0,
      processing: 0,
      uploaded: 0,
      failed: 0,
    };
    statusAgg.forEach((s) => {
      counts[s._id] = s.count;
    });

    const totals = totalsAgg[0] || {};
    const now = Date.now();

    const rows = recordings.map((r) => {
      const files = [...r.files]
        .sort((a, b) => a.part - b.part)
        .map((f) => ({
          part: f.part,
          fileName: f.fileName,
          url: f.url,
          size: f.size || 0,
          duration: f.duration || 0,
        }));

      return {
        recordingId: r._id,
        roomId: r.roomId,
        title: r.meetingId?.title || "–",
        meetingStatus: r.meetingId?.status || null,
        host: r.meetingId?.hostId || null,
        startedBy: r.startedBy,
        status: r.status,
        // Stop ho gayi par file 15+ min se upload nahi hui
        stalled:
          r.status === "processing" &&
          r.stoppedAt &&
          now - new Date(r.stoppedAt).getTime() > STALLED_AFTER_MS,
        error: r.error,
        startedAt: r.startedAt,
        stoppedAt: r.stoppedAt,
        partsCount: files.length,
        totalSize: files.reduce((s, f) => s + f.size, 0),
        totalDuration: files.reduce((s, f) => s + f.duration, 0),
        files,
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        total: Object.values(counts).reduce((a, b) => a + b, 0),
        ...counts,
        totalSize: totals.totalSize || 0, // bytes
        totalDuration: totals.totalDuration || 0, // seconds
        totalFiles: totals.totalFiles || 0,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      recordings: rows,
    });
  } catch (error) {
    console.error("ADMIN RECORDINGS ERROR:", error);
    fail(res, 500, error.message);
  }
};

/* =====================================================
   ADMIN: recording delete (Bunny + DB)
   DELETE /admin/recordings/:recordingId
   ?force=true  -> atki hui "recording/paused" recording bhi delete ho jaati hai
===================================================== */
exports.adminDeleteRecording = async (req, res) => {
  try {
    const recording = await Recording.findById(req.params.recordingId);

    if (!recording) {
      return fail(res, 404, "Recording not found");
    }

    const isLive =
      recording.status === "recording" || recording.status === "paused";

    if (isLive && req.query.force !== "true") {
      return fail(
        res,
        400,
        "Recording abhi chal rahi hai. Force delete ke liye ?force=true use karo."
      );
    }

    const allDeleted = await purgeBunnyFiles(recording);

    if (!allDeleted) {
      return fail(
        res,
        502,
        "Bunny se kuch files delete nahi ho payi. Thodi der baad dobara try karo."
      );
    }

    await recording.deleteOne();

    // Force delete me meeting ke recording flags bhi saaf karo
    if (isLive) await clearMeetingFlags(recording.meetingId);

    res.status(200).json({ success: true, message: "Recording deleted" });
  } catch (error) {
    console.error("ADMIN DELETE RECORDING ERROR:", error);
    fail(res, 500, error.message);
  }
};