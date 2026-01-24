const express = require("express");
const dotenv = require("dotenv");
const app = express();
dotenv.config();
const port = process.env.PORT || 3000;

// Health Check Route
app.use("/healthcheck", require("./routes/healthcheck.js"));

app.listen(port, () => console.log("App listening on port", port));
