import express from "express";
import { config } from "dotenv";
import cors from "cors";

import { errorHandler, verifyToken } from "#middleware";
import { healthRoutes, authRoutes, awsRoutes, teamRoutes } from "#modules";

// App Setup
const app = express();
app.use(express.json());
config();

// CORS
var corsOptions = {
  origin: "http://localhost:5173",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", verifyToken, teamRoutes);

// Error handling
app.use(errorHandler);

export default app;
