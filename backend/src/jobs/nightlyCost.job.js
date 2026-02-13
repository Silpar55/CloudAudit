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
    Promise.all(
      accounts.map(async (acc) => {
        await awsService.ceGetCostAndUsage(acc.team_id, acc.aws_account_id);
      }),
    );

    console.log("Nightly AWS cost fetch completed successfully");
  } catch (error) {
    console.error("Nightly AWS cost fetch failed:", error);
  }
};
