import express from "express";
import { config } from "dotenv";

import { errorHandler, verifyToken } from "#middleware";
import { healthRoutes, authRoutes, awsRoutes, teamRoutes } from "#modules";

// App Setup
const app = express();
app.use(express.json());
config();

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/teams", verifyToken, teamRoutes);

// Error handling
app.use(errorHandler);

export default app;
