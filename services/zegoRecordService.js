const axios = require("axios");
const crypto = require("crypto");

const buildSignedUrl = (action) => {
  const { ZEGO_APP_ID, ZEGO_SERVER_SECRET, ZEGO_RECORD_API } = process.env;

  const nonce = crypto.randomBytes(8).toString("hex");
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature = md5(AppId + SignatureNonce + ServerSecret + Timestamp)
  const signature = crypto
    .createHash("md5")
    .update(`${ZEGO_APP_ID}${nonce}${ZEGO_SERVER_SECRET}${timestamp}`)
    .digest("hex");

  const base = ZEGO_RECORD_API.replace(/\/$/, "");

  return (
    `${base}/?Action=${action}` +
    `&AppId=${ZEGO_APP_ID}` +
    `&SignatureNonce=${nonce}` +
    `&Timestamp=${timestamp}` +
    `&Signature=${signature}` +
    `&SignatureVersion=2.0`
  );
};

const call = async (action, body) => {
  const { data } = await axios.post(buildSignedUrl(action), body, {
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
  });

  if (data.Code !== 0) {
    throw new Error(`Zego ${action} failed: ${data.Code} - ${data.Message}`);
  }

  return data.Data;
};

/**
 * Recording start. Har baar naya taskId milta hai.
 * Pause/Resume ke liye bhi yehi use hota hai (resume = naya start).
 */
exports.startRecording = async (roomId) => {
  const data = await call("StartRecord", {
    RoomId: roomId,
    RecordInputParams: {
      RecordMode: 2, // 2 = mixed stream (sab log ek video me)
      StreamType: 3, // audio + video
      MaxIdleTime: 120, // room khali ho to 120s baad auto stop
      MixConfig: {
        MixOutputStreamId: `rec_${roomId}_${Date.now()}`,
        MixOutputVideoConfig: {
          Width: 1280,
          Height: 720,
          Fps: 15,
          Bitrate: 1500000,
        },
      },
    },
    RecordOutputParams: {
      OutputFileFormat: "mp4",
      OutputFolder: `recordings/${roomId}/`,
    },
  });

  return data.TaskId;
};

/** Recording stop (pause ke liye bhi yehi). */
exports.stopRecording = async (taskId) => {
  return call("StopRecord", { TaskId: taskId });
};