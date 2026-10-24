require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const scheduledMeetingRoutes = require("./routes/scheduledMeetingRoutes");
const meetingSocket = require("./socket/meetingSocket");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.set("io", io);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Zego Meet Backend Running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/meeting", meetingRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/scheduled-meeting", scheduledMeetingRoutes);

mongoose
