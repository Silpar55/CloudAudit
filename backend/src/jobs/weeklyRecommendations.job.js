import cron from "node-cron";
import * as awsModel from "#modules/aws/aws.model.js";
import * as recommendationsService from "#modules/recommendations/recommendations.service.js";

export const startWeeklyRecommendationsJob = () => {
  // Runs at 03:00 AM every Sunday
  cron.schedule("0 3 * * 0", async () => {
    await runWeeklyRecommendationsJob();
  });
};

export const runWeeklyRecommendationsJob = async () => {
  console.log("[CRON] Weekly AWS recommendation generation started.");
  const startTime = Date.now();

  try {
    const accounts = await awsModel.getAllAccounts();

    let successCount = 0;
    let errorCount = 0;

    // We process sequentially (for...of) rather than concurrently (Promise.all)
    // to prevent CPU/memory spikes that could cause server downtime or block the event loop.
    for (const account of accounts) {
      try {
        // Skip accounts that are disconnected or failed
        if (account.status !== "active") {
          continue;
        }

        await recommendationsService.runDetectionCycle(account);
        successCount++;
      } catch (accountError) {
        errorCount++;
        console.error(
          `[CRON] Error generating recommendations for account ${account.id}:`,
          accountError,
        );
      }
    }

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `[CRON] Weekly recommendation generation completed in ${durationSec}s. Success: ${successCount}, Errors: ${errorCount}`,
    );
  } catch (error) {
    console.error(
      "[CRON] Fatal error in weekly recommendation job pipeline:",
      error,
    );
  }
};
