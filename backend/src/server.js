/**
 * CloudAudit — Node.js process entrypoint.
 *
 * Binds the Express app to PORT, verifies PostgreSQL and AWS platform connectivity
 * on boot, then starts scheduled jobs (nightly cost sync, weekly recommendations).
 * Run via `npm start` in `backend/`.
 */
import app from "#app";
import { verifyAwsConnection } from "#utils/aws/sts.js";
import { verifyDatabaseConnection } from "#config";
import { startNightlyCostJob } from "./jobs/nightlyCost.job.js";
import { startWeeklyRecommendationsJob } from "./jobs/weeklyRecommendations.job.js";

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  await verifyDatabaseConnection();
  await verifyAwsConnection();

  // Initialize Cron Jobs
  startNightlyCostJob();
  startWeeklyRecommendationsJob();

  console.log("App listening on port", port);
});
