const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const dotenv = require("dotenv");
dotenv.config();

const userRoute = require("./routes/user-route.js");
const orgRoute = require("./routes/organisation-route.js");
const orgAdminOwnerRoute = require("./routes/organisation-admin-owner-route.js");
const eventUserRoute = require("./routes/event-user-route.js");
const checkProfileCompleted = require("./middleware/completeProfile.js");
const isAuth = require("./middleware/is-auth.js");

const app = express();

app.use(express.json());
app.use(cookieParser());
// app.use(helmet());
// app.use(morgan("dev"));

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use("/auth", userRoute);
app.use(orgRoute);
app.use(orgAdminOwnerRoute);
app.use(eventUserRoute);

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  let message = error.message || "Something went wrong!";
  let data = error.data || null;
  console.error(`[${new Date().toISOString()}]`, error);

  if (status === 500) {
    message = "Internal server error.";
    data = null;
  }

  if ((status === 401 || status === 403) && !error.message) {
    message = "Authentication failed! Login Again.";
    data = null;
  }

  res.status(status).json({ message, data });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const io = require("./socket").init(server);
io.on("connection", (socket) => {
  console.log("Client connected!");
});
