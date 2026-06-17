// require("dotenv").config();

// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const authRoutes = require("./routes/authRoutes");
// const meetingRoutes = require("./routes/meetingRoutes");

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Health Check
// app.get("/", (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: "Zego Meet Backend Running 🚀",
//   });
// });

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/meeting", meetingRoutes);

// // MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI)
//   .then(() => {
//     console.log("✅ MongoDB Connected");

//     const PORT = process.env.PORT || 5000;

//     app.listen(PORT, () => {
//       console.log(`🚀 Server Running On Port ${PORT}`);
//     });
//   })
//   .catch((error) => {
//     console.log("❌ MongoDB Connection Error");
//     console.log(error.message);
//   });


require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const meetingRoutes = require("./routes/meetingRoutes");

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


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {

    console.log("✅ MongoDB Connected");

 
    meetingSocket(io);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(
        `🚀 Server Running On Port ${PORT}`
      );
    });

  })
  .catch((error) => {

    console.log(
      "❌ MongoDB Connection Error"
    );

    console.log(error.message);

  });