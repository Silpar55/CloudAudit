import express from "express";
import { config } from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";

import { errorHandler, verifyToken } from "#middleware";
import { healthRoutes, authRoutes, teamRoutes, profileRoutes } from "#modules";
import { previewTeamInvitation } from "#modules/team/team.controller.js";
import {
  requestLoggerMiddleware,
  requestMetricsMiddleware,
} from "./middleware/monitoring.middleware.js";

// App Setup
const app = express();
app.use(express.json());
app.use(cookieParser());
config();
app.use(requestMetricsMiddleware);
app.use(requestLoggerMiddleware);

// CORS
var corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.get("/api/teams/invitations/preview", previewTeamInvitation);
app.use("/api/teams", verifyToken, teamRoutes);
app.use("/api/profile", verifyToken, profileRoutes);

// Error handling
app.use(errorHandler);

export default app;
