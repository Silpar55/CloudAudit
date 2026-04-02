import cron from "node-cron";
import * as awsService from "#modules/aws/aws.service.js";
import * as awsModel from "#modules/aws/aws.model.js";

export const startNightlyCostJob = () => {
  cron.schedule("0 2 * * *", async () => {
    await runNightlyCostJob();
  });
};

export const runNightlyCostJob = async () => {
  console.log("Nightly AWS cost fetch started");

  try {
    const accounts = await awsModel.getAllAccounts();
    await Promise.all(
      accounts.map(async (acc) => {
        await awsService.ceGetCostAndUsage(acc);
      }),
    );

    console.log("Nightly AWS cost fetch completed successfully");
  } catch (error) {
    console.error("Nightly AWS cost fetch failed:", error);
  }
};
