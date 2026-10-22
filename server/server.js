
import express from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import router from "./routes/homeRoutes.js";

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(router);
// Authentication routes
app.use("/api/auth", authRoutes);


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
