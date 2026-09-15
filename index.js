/**
 * @file index.js
 * @description Primary entry point for the Yeog Cafe Backend application.
 * Initializes Express, mounts global middlewares & REST route handlers, creates HTTP & Socket.IO servers,
 * attaches WebSocket event logic, connects to MongoDB, and triggers initial database seeding.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Global Middleware Configuration: CORS origin restriction and JSON body parsing
app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://localhost:5173"].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }),
  express.json(),
);

// Photo Upload Route (Protected via authMiddleware)
const authMiddleware = require("./middlewares/authMiddleware");
const uploadRoutes = require("./uploads/upload");
app.use("/upload", authMiddleware, uploadRoutes);

// Admin Routes (/api/admin)
const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// Table Management Routes (/api/tables)
const tableRoutes = require("./routes/tableRoutes");
app.use("/api/tables", tableRoutes);

// Menu Catalog Routes (/api/menu)
const menuRoutes = require("./routes/menuRoutes");
app.use("/api/menu", menuRoutes);

// Order Management Routes (/api/orders)
const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// HTTP & Socket.IO Server Setup
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, "http://localhost:5173"].filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  },
});

// Register WebSocket handlers
const setupWebSocket = require("./webSocket/socket");
setupWebSocket(io);

// Expose io to all routes so they can emit events on REST actions
app.set('io', io);

// Start HTTP Server
server.listen(process.env.PORT, () => {
  console.log("Server is running on port", process.env.PORT);
});

// Database Connection & Initial Seeding
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

