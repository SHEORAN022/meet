const Meeting = require("../models/Meeting");
const MeetingChat = require("../models/MeetingChat");
const MeetingParticipant = require("../models/MeetingParticipant");

module.exports = (io) => {

  // Active rooms track karne ke liye — roomId -> Map(socketId -> userInfo)
  const roomParticipants = new Map();

  io.on("connection", (socket) => {
    console.log("✅ User Connected:", socket.id);

    // ─── Join Room ───────────────────────────────────────────
    socket.on("join-room", async ({ roomId, userId, userName, userEmail }) => {
      try {
        socket.join(roomId);
        socket.roomId = roomId;
        socket.userId = userId;
        socket.userName = userName;

        if (!roomParticipants.has(roomId)) {
          roomParticipants.set(roomId, new Map());
        }

        roomParticipants.get(roomId).set(socket.id, {
          socketId: socket.id,
          userId,
          userName,
          userEmail,
        });

        // Naye user ko existing participants ki list do
        const participants = Array.from(
          roomParticipants.get(roomId).values()
        );
        socket.emit("room-participants", { participants });

        // Baakon ko batao naya user aaya
        socket.to(roomId).emit("user-joined", {
          userId,
          userName,
          userEmail,
          socketId: socket.id,
        });

        console.log(`📌 ${userName} joined room: ${roomId}`);
      } catch (error) {
        console.log("JOIN ROOM ERROR:", error.message);
      }
    });

    // ─── Send Message ────────────────────────────────────────
    socket.on("send-message", async ({ roomId, userId, message }) => {
      try {
        if (!message?.trim()) return;

        const meeting = await Meeting.findOne({ roomId });
        if (!meeting) return;

        if (meeting.status === "ended") return;

        const chat = await MeetingChat.create({
          meetingId: meeting._id,
          senderId: userId,
          message: message.trim(),
        });

        const savedChat = await MeetingChat.findById(chat._id).populate(
          "senderId",
          "name email"
        );

        // Sender ko bhi include karke poore room mein bhejo
        io.to(roomId).emit("receive-message", {
          _id: savedChat._id,
          message: savedChat.message,
          senderId: savedChat.senderId._id,
          senderName: savedChat.senderId.name,
          senderEmail: savedChat.senderId.email,
          createdAt: savedChat.createdAt,
        });

      } catch (error) {
        console.log("SEND MESSAGE ERROR:", error.message);
        socket.emit("message-error", { error: "Message send nahi hua" });
      }
    });

    // ─── Mute Notifications ──────────────────────────────────
    socket.on("mute-user-notify", ({ roomId, targetUserId, mutedBy }) => {
      io.to(roomId).emit("user-muted", { targetUserId, mutedBy });
    });

    socket.on("unmute-user-notify", ({ roomId, targetUserId }) => {
      io.to(roomId).emit("user-unmuted", { targetUserId });
    });

    socket.on("mute-all-notify", ({ roomId, mutedBy }) => {
      io.to(roomId).emit("all-muted", { mutedBy });
    });

    socket.on("unmute-all-notify", ({ roomId }) => {
      io.to(roomId).emit("all-unmuted");
    });

    // ─── Remove User Notification ────────────────────────────
    socket.on("remove-user-notify", ({ roomId, targetUserId }) => {
      io.to(roomId).emit("user-removed", { targetUserId });
    });

    socket.on("remove-all-notify", ({ roomId }) => {
      io.to(roomId).emit("all-removed");
    });

    // ─── Screen Share ────────────────────────────────────────
    socket.on("screen-share-started", ({ roomId, userId, userName }) => {
      socket.to(roomId).emit("screen-share-started", { userId, userName });
    });

    socket.on("screen-share-stopped", ({ roomId, userId }) => {
      socket.to(roomId).emit("screen-share-stopped", { userId });
    });

    // ─── Host Transfer ───────────────────────────────────────
    socket.on("host-transferred", ({ roomId, oldHostId, newHostId, newHostName }) => {
      io.to(roomId).emit("host-transferred", {
        oldHostId,
        newHostId,
        newHostName,
      });
    });

    // ─── Waiting Room ────────────────────────────────────────
    socket.on("user-admitted", ({ roomId, userId }) => {
      io.to(roomId).emit("user-admitted", { userId });
    });

    socket.on("user-rejected", ({ roomId, userId }) => {
      io.to(roomId).emit("user-rejected", { userId });
    });

    socket.on("waiting-user-joined", ({ roomId, userId, userName, userEmail }) => {
      // Host ko notify karo waiting room mein koi aaya
      socket.to(roomId).emit("new-waiting-user", {
        userId,
        userName,
        userEmail,
      });
    });

    // ─── Meeting Ended ───────────────────────────────────────
    socket.on("meeting-ended", ({ roomId }) => {
      io.to(roomId).emit("meeting-ended");
    });

    // ─── Leave Room ──────────────────────────────────────────
    socket.on("leave-room", ({ roomId, userId, userName }) => {
      socket.leave(roomId);

      if (roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(socket.id);

        if (roomParticipants.get(roomId).size === 0) {
          roomParticipants.delete(roomId);
        }
      }

      socket.to(roomId).emit("user-left", {
        userId,
        userName,
        socketId: socket.id,
      });

      console.log(`🚪 ${userName} left room: ${roomId}`);
    });

    // ─── Disconnect ──────────────────────────────────────────
    socket.on("disconnect", () => {
      const { roomId, userId, userName } = socket;

      if (roomId && roomParticipants.has(roomId)) {
        roomParticipants.get(roomId).delete(socket.id);

        if (roomParticipants.get(roomId).size === 0) {
          roomParticipants.delete(roomId);
        }

        socket.to(roomId).emit("user-left", {
          userId,
          userName,
          socketId: socket.id,
        });
      }

      console.log("❌ User Disconnected:", socket.id);
    });

  });

};