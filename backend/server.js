import express from "express";
import { config } from "dotenv";

// Routes
import healthcheckRouter from "./routes/healthcheck.js";

// App Setup
const app = express();
config();
const port = process.env.PORT || 3000;

// Healthcheck Route
app.use("/healthcheck", healthcheckRouter);
app.listen(port, () => console.log("App listening on port", port));
