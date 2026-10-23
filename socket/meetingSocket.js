const Meeting = require("../models/Meeting");
const MeetingChat = require("../models/MeetingChat");

module.exports = (io) => {

  io.on("connection", (socket) => {

    console.log("User Connected");

    // Join Meeting Room
    socket.on("join-room", (roomId) => {

      socket.join(roomId);

      console.log(
        `Joined Room: ${roomId}`
      );

    });

    // Send Message
    socket.on(
      "send-message",
      async (data) => {

        try {

          const {
            roomId,
            userId,
            message,
          } = data;

          const meeting =
            await Meeting.findOne({
              roomId,
            });

          if (!meeting) {
            return;
          }

          const chat =
            await MeetingChat.create({
              meetingId: meeting._id,
              senderId: userId,
              message,
            });

          const savedChat =
            await MeetingChat.findById(
              chat._id
            ).populate(
              "senderId",
              "name email"
            );

          io.to(roomId).emit(
            "receive-message",
            savedChat
          );

        } catch (error) {

          console.log(
            "CHAT ERROR:",
            error.message
          );

        }

      }
    );

    socket.on(
      "leave-room",
      (roomId) => {

        socket.leave(roomId);

      }
    );

    socket.on(
      "disconnect",
      () => {

        console.log(
          "User Disconnected"
        );

      }
    );

  });

};