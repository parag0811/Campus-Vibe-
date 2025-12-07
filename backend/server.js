const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const dotenv = require("dotenv");
dotenv.config();

const userRoute = require("./routes/user-route.js");
const orgRoute = require("./routes/organisation-route.js");
const orgAdminOwnerRoute = require("./routes/organisation-admin-owner-route.js");
const eventUserRoute = require("./routes/event-user-route.js");
const paymentRoutes = require("./routes/payment-route.js");
const ownerSettlementRoute = require("./routes/owner-settlement-route");

const app = express();

const CLIENT_URL = process.env.CLIENT_URL;
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control");
  next();
});

app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Origin", CLIENT_URL);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cache-Control");
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());

app.use("/auth", userRoute);
app.use("/org", orgRoute);
app.use("/org-admin", orgAdminOwnerRoute);
app.use("/", eventUserRoute);
app.use("/payment", paymentRoutes);
app.use("/owner", ownerSettlementRoute);

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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
