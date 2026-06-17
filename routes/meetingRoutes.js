const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  getMeetingChats,
} = require("../controllers/chatController");
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
} = require("../controllers/meetingController");

// Create Meeting
router.post(
  "/create",
  auth,
  createMeeting
);
router.get("/history", auth, getMeetingHistory);
router.get(
  "/joined-history",
  auth,
  getJoinedMeetingsHistory
);

router.get("/active", auth, getActiveMeetings);

router.get("/share/:roomId", auth, shareMeeting);

router.post(
  "/leave",
  auth,
  leaveMeeting
);

router.get(
  "/participants/:roomId",
  auth,
  getMeetingParticipants
); 

router.get(
  "/my-meetings",
  auth,
  getMyMeetings
);



// End Meeting
router.put(
  "/end/:roomId",
  auth,
  endMeeting
);

router.post("/join", auth, joinMeeting);

router.post("/mute-user", auth, muteUser);

router.post("/mute-all", auth, muteAll);

router.post("/remove-user", auth, removeUser);

router.post("/remove-all", auth, removeAll);
router.get(
  "/info/:roomId",
  auth,
  getMeetingInfo
);
router.post(
  "/unmute-user",
  auth,
  unmuteUser
);
router.post(
  "/unmute-all",
  auth,
  unmuteAll
);
router.post(
  "/transfer-host",
  auth,
  transferHost
);
router.post(
  "/screen-share/start",
  auth,
  startScreenShare
);

router.post(
  "/screen-share/stop",
  auth,
  stopScreenShare
);

router.get(
  "/screen-share/:roomId",
  auth,
  getScreenShareStatus
);
router.get(
  "/waiting/:roomId",
  auth,
  getWaitingParticipants
);

router.post(
  "/admit-user",
  auth,
  admitUser
);

router.post(
  "/reject-user",
  auth,
  rejectUser
);

// router.get(
//   "/:roomId",
//   auth,
//   getMeetingByRoomId
// );

router.get(
  "/chat/:roomId",
  auth,
  getMeetingChats
);
router.get("/:roomId", auth, getMeetingByRoomId);
module.exports = router;