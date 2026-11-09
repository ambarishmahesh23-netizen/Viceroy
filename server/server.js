import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import router from "./routes/homeRoutes.js";

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(router);

// API routes (All 20 Modules MERN architecture)
app.use("/api/auth", authRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);

// Start server after connecting to MongoDB
connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server started on PORT:${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error.message);
  });

app.get("/", (req, res) => {
  res.send("Viceroy Resort API Working");
});

