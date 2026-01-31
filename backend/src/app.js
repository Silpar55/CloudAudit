import express from "express";
import { config } from "dotenv";

import { errorHandler, verifyToken } from "#middleware";
import { healthRoutes, authRoutes, awsRoutes, teamRoutes } from "#modules";

// App Setup
const app = express();
app.use(express.json());
config();

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/aws", verifyToken, awsRoutes);
app.use("/team", verifyToken, teamRoutes);

// Error handling
app.use(errorHandler);

export default app;
