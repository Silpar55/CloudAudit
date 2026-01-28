import express from "express";
import { config } from "dotenv";

import { authRoutes, healthcheckRoutes } from "#routes";
import { errorHandler } from "#middleware";

// App Setup
const app = express();
app.use(express.json());
config();

app.use("/healthcheck", healthcheckRoutes);
app.use("/auth", authRoutes);

// Error handling
app.use(errorHandler);

export default app;
