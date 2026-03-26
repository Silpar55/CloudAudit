import cron from "node-cron";
import * as awsModel from "#modules/aws/aws.model.js";
import * as recommendationsService from "#modules/recommendations/recommendations.service.js";
import { sendWeeklyReportSlackMessage } from "#utils/notifications/slack.js";

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
    const activeAccounts = accounts.filter((account) => account.status === "active");

    let successCount = 0;
    let errorCount = 0;

    // We process sequentially (for...of) rather than concurrently (Promise.all)
    // to prevent CPU/memory spikes that could cause server downtime or block the event loop.
    for (const account of activeAccounts) {
      try {
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
    const summary = {
      totalAccounts: activeAccounts.length,
      successCount,
      errorCount,
      durationSec,
    };

    console.log(
      `[CRON] Weekly recommendation generation completed in ${durationSec}s. Success: ${successCount}, Errors: ${errorCount}`,
    );

    try {
      await sendWeeklyReportSlackMessage(summary);
    } catch (slackError) {
      console.error("[CRON] Failed to send weekly Slack report:", slackError);
    }
  } catch (error) {
    console.error(
      "[CRON] Fatal error in weekly recommendation job pipeline:",
      error,
    );

    const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
    try {
      await sendWeeklyReportSlackMessage({
        totalAccounts: 0,
        successCount: 0,
        errorCount: 1,
        durationSec,
        failed: true,
        errorMessage: error?.message || "Unknown weekly job failure",
      });
    } catch (slackError) {
      console.error(
        "[CRON] Failed to send weekly failure Slack report:",
        slackError,
      );
    }
  }
};
