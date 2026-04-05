/**
 * CloudAudit — Unit tests for `slack`.
 * Run from `backend/` with `npm test`.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  formatAnomalySlackMessage,
  formatMlAnalysisPassedSlackMessage,
  formatWeeklySlackMessage,
  sendAnomalyAlertSlackMessage,
  sendMlAnalysisPassedSlackMessage,
  sendSlackMessage,
  sendWeeklyReportSlackMessage,
} from "#utils/notifications/slack.js";

describe("Slack notification utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.SLACK_NOTIFICATIONS_ENABLED = "false";
    process.env.SLACK_WEBHOOK_URL = "";
  });

  describe("formatters", () => {
    it("formats weekly payload with summary blocks", () => {
      const payload = formatWeeklySlackMessage({
        totalAccounts: 3,
        successCount: 2,
        errorCount: 1,
        durationSec: "12.5",
      });

      expect(payload.text).toContain("Weekly Cost Report");
      expect(payload.blocks).toHaveLength(2);
    });

    it("formats anomaly alert payload", () => {
      const payload = formatAnomalySlackMessage({
        actorName: "User 1",
        awsAccountNumber: "123456789012",
        anomaliesDetected: 2,
        recommendationsGenerated: 1,
      });

      expect(payload.text).toContain("User 1 ran analysis");
      expect(payload.text).toContain("2 anomalies");
      expect(payload.blocks).toHaveLength(2);
    });

    it("formats ML passed success payload", () => {
      const payload = formatMlAnalysisPassedSlackMessage({
        actorName: "User 1",
        awsAccountNumber: "123456789012",
        recommendationsGenerated: 0,
      });

      expect(payload.text).toContain("0 anomalies");
      expect(payload.blocks).toHaveLength(2);
    });
  });

  describe("sender", () => {
    it("skips when notifications are disabled", async () => {
      const result = await sendSlackMessage({ text: "test" });

      expect(result).toEqual({
        skipped: true,
        reason: "Slack notifications disabled",
      });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("posts payload to Slack webhook when enabled", async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = "true";
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
      global.fetch.mockResolvedValue({ ok: true });

      const result = await sendSlackMessage({ text: "test" });

      expect(global.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/test",
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(result).toEqual({ ok: true });
    });

    it("throws when Slack webhook returns non-200", async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = "true";
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "internal error",
      });

      await expect(sendSlackMessage({ text: "test" })).rejects.toThrow(
        "Slack webhook request failed with status 500. internal error",
      );
    });
  });

  describe("high-level helpers", () => {
    it("sends weekly message through helper", async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = "true";
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
      global.fetch.mockResolvedValue({ ok: true });

      await sendWeeklyReportSlackMessage({
        totalAccounts: 1,
        successCount: 1,
        errorCount: 0,
        durationSec: "1.0",
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("sends anomaly alert through helper", async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = "true";
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
      global.fetch.mockResolvedValue({ ok: true });

      await sendAnomalyAlertSlackMessage({
        actorName: "User 1",
        awsAccountNumber: "123456789012",
        anomaliesDetected: 1,
        recommendationsGenerated: 0,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("sends ML passed success through helper", async () => {
      process.env.SLACK_NOTIFICATIONS_ENABLED = "true";
      process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/test";
      global.fetch.mockResolvedValue({ ok: true });

      await sendMlAnalysisPassedSlackMessage({
        actorName: "User 1",
        awsAccountNumber: "123456789012",
        recommendationsGenerated: 0,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
