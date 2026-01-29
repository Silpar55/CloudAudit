import express from "express";
import { config } from "dotenv";

import { authRoutes, awsRoutes, healthcheckRoutes } from "#routes";
import { errorHandler, verifyToken } from "#middleware";

// App Setup
const app = express();
app.use(express.json());
config();

app.use("/healthcheck", healthcheckRoutes);
app.use("/auth", authRoutes);
app.use("/aws", verifyToken, awsRoutes);

// Error handling
app.use(errorHandler);

export default app;
