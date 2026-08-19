import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import morgan from "morgan";
import { connectDB } from "./config/db";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import launcherRoutes from "./routes/launcherRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5010;
const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((item) => item.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", service: "program-internal", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/launcher", launcherRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found." });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Program Internal backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
