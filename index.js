require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
app.use(
  cors({
    origin: [process.env.CLIENT_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
  express.json(),
);

const authMiddleware = require("./middlewares/authMiddleware");
const uploadRoutes = require("./uploads/upload");
app.use("/upload", authMiddleware, uploadRoutes);

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

const tableRoutes = require("./routes/tableRoutes");
app.use("/api/tables", tableRoutes);

const menuRoutes = require("./routes/menuRoutes");
app.use("/api/menu", menuRoutes);

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

const setupWebSocket = require("./webSocket/socket");
setupWebSocket(io);

server.listen(process.env.PORT, () => {
  console.log("Server is running on port", process.env.PORT);
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database connected successfully");
    const { seedAdmin } = require("./controllers/adminController");
    const { seedTables } = require("./controllers/tableController");
    seedAdmin();
    seedTables();
  })
  .catch((err) => {
    console.log("unable to connect to MongoDB", err);
  });
