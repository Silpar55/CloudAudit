import { beforeEach, describe, expect, it, jest } from "@jest/globals";

jest.mock("#modules/aws/aws.model.js");
jest.mock("#modules/aws/aws.service.js");
jest.mock("#modules/anomaly/anomaly.service.js");
jest.mock("#utils/notifications/slack.js");

import * as awsModel from "#modules/aws/aws.model.js";
import * as awsService from "#modules/aws/aws.service.js";
import * as anomalyService from "#modules/anomaly/anomaly.service.js";
import { sendWeeklyReportSlackMessage } from "#utils/notifications/slack.js";
import { runWeeklyRecommendationsJob } from "../../../src/jobs/weeklyRecommendations.job.js";

describe("weeklyRecommendations job", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sends weekly Slack summary after processing active accounts", async () => {
    awsModel.getAllAccounts.mockResolvedValue([
      { id: "acc-1", status: "active" },
      { id: "acc-2", status: "disconnected" },
      { id: "acc-3", status: "active" },
    ]);
    awsService.syncCurData.mockResolvedValue({ status: "ok" });
    anomalyService.runScheduledWeeklyAccountAnalysis.mockResolvedValue({});
    sendWeeklyReportSlackMessage.mockResolvedValue({ ok: true });

    await runWeeklyRecommendationsJob();

    expect(awsService.syncCurData).toHaveBeenCalledTimes(2);
    expect(anomalyService.runScheduledWeeklyAccountAnalysis).toHaveBeenCalledTimes(
      2,
    );
    expect(sendWeeklyReportSlackMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAccounts: 2,
        successCount: 2,
        errorCount: 0,
      }),
    );
  });

  it("sends failure summary when account retrieval fails", async () => {
    awsModel.getAllAccounts.mockRejectedValue(new Error("db unavailable"));
    sendWeeklyReportSlackMessage.mockResolvedValue({ ok: true });

    await runWeeklyRecommendationsJob();

    expect(sendWeeklyReportSlackMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        failed: true,
        errorCount: 1,
      }),
    );
  });
});
