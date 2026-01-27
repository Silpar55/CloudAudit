import express from "express";
import { config } from "dotenv";

// Routes
import healthcheckRouter from "./routes/healthcheck.js";
import authRouter from "./routes/auth.js";

// App Setup
const app = express();
app.use(express.json());
config();
const port = process.env.PORT || 3000;

// Healthcheck Route
app.use("/healthcheck", healthcheckRouter);

// Auth routes
app.use("/auth", authRouter);

app.listen(port, () => console.log("App listening on port", port));

export default app;
