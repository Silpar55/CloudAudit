import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AppError } from "#utils/helper/AppError.js";

jest.mock("#modules/anomaly/anomaly.model.js");
jest.mock("../../../../src/modules/recommendations/recommendations.service.js");
jest.mock("../../../../src/modules/recommendations/recommendations.model.js");
jest.mock("#utils/notifications/slack.js");
jest.mock("#modules/audit/audit.model.js");

import * as anomalyModel from "#modules/anomaly/anomaly.model.js";
import * as recommendationsService from "../../../../src/modules/recommendations/recommendations.service.js";
import * as recommendationsModel from "../../../../src/modules/recommendations/recommendations.model.js";
import {
  sendAnomalyAlertSlackMessage,
  sendMlAnalysisPassedSlackMessage,
} from "#utils/notifications/slack.js";
import { insertAuditLog } from "#modules/audit/audit.model.js";
import {
  getAnomalies,
  triggerAnalysis,
} from "#modules/anomaly/anomaly.service.js";

describe("Anomaly Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(); // Mock Node's native fetch
  });

  describe("getAnomalies", () => {
    it("Should return anomalies successfully", async () => {
      const mockAnomalies = [{ id: "1" }];
      anomalyModel.getAnomaliesByInternalId.mockResolvedValue(mockAnomalies);

      const result = await getAnomalies({ id: "acc-123" });
      expect(result).toEqual(mockAnomalies);
      expect(anomalyModel.getAnomaliesByInternalId).toHaveBeenCalledWith(
        "acc-123",
      );
    });

    it("Should throw AppError if model returns null", async () => {
      anomalyModel.getAnomaliesByInternalId.mockResolvedValue(null);
      await expect(getAnomalies({ id: "acc-123" })).rejects.toThrow(AppError);
    });
  });

  describe("triggerAnalysis", () => {
    it("Should call ML service and return data on success", async () => {
      const mockResponse = { status: "success", anomalies_detected: 2 };
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      });

      anomalyModel.getAnomaliesByInternalId.mockResolvedValue([
        { anomaly_id: "a1", status: "open" },
        { anomaly_id: "a2", status: "open" },
      ]);
      recommendationsModel.getRecommendationsByInternalId.mockResolvedValue([
        { recommendation_id: "r1" },
      ]);

      recommendationsService.runDetectionCycle.mockResolvedValue({
        ai_recommendations_generated: 1,
      });
      sendAnomalyAlertSlackMessage.mockResolvedValue({ ok: true });
      insertAuditLog.mockResolvedValue({});

      const account = {
        id: "acc-123",
        external_id: "ext-uuid-123",
        aws_account_id: "123456789012",
        team_id: "team-1",
      };

      const result = await triggerAnalysis(account, "user-1", "User 1");
      expect(global.fetch).toHaveBeenCalled();
      expect(result.anomalies_detected).toEqual(2);
      expect(result.recommendations_generated).toEqual(1);
      expect(sendAnomalyAlertSlackMessage).toHaveBeenCalledWith({
        actorName: "User 1",
        awsAccountNumber: "123456789012",
        anomaliesDetected: 2,
        recommendationsGenerated: 1,
      });
      expect(sendMlAnalysisPassedSlackMessage).not.toHaveBeenCalled();
      expect(insertAuditLog).toHaveBeenCalledWith(
        "team-1",
        "user-1",
        "ML_ANALYSIS_RAN",
        expect.objectContaining({
          awsAccountNumber: "123456789012",
          anomaliesDetected: 2,
          recommendationsGenerated: 1,
          mlStatus: "anomalies_detected",
        }),
      );
    });

    it("Should send ML success message when DB has no open anomalies", async () => {
      const mockResponse = { status: "success", anomalies_detected: 2 };
      global.fetch.mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
      });

      anomalyModel.getAnomaliesByInternalId.mockResolvedValue([]);
      recommendationsModel.getRecommendationsByInternalId.mockResolvedValue([]);
      recommendationsService.runDetectionCycle.mockResolvedValue({
        ai_recommendations_generated: 0,
      });
      sendMlAnalysisPassedSlackMessage.mockResolvedValue({ ok: true });

      insertAuditLog.mockResolvedValue({});

      const account = {
        id: "acc-123",
        external_id: "ext-uuid-123",
        aws_account_id: "123456789012",
        team_id: "team-1",
      };

      const result = await triggerAnalysis(account, "user-1", "User 1");

      expect(result.anomalies_detected).toEqual(0);
      expect(result.recommendations_generated).toEqual(0);
      expect(sendAnomalyAlertSlackMessage).not.toHaveBeenCalled();
      expect(sendMlAnalysisPassedSlackMessage).toHaveBeenCalledWith({
        actorName: "User 1",
        awsAccountNumber: "123456789012",
        recommendationsGenerated: 0,
      });
      expect(insertAuditLog).toHaveBeenCalledWith(
        "team-1",
        "user-1",
        "ML_ANALYSIS_RAN",
        expect.objectContaining({
          awsAccountNumber: "123456789012",
          anomaliesDetected: 0,
          recommendationsGenerated: 0,
          mlStatus: "no_anomalies",
        }),
      );
    });

    it("Should throw 503 AppError if ML service is unreachable", async () => {
      global.fetch.mockRejectedValue(new TypeError("fetch failed"));

      await expect(
        triggerAnalysis(
          { id: "acc-123", external_id: "ext-uuid-123" },
          "user-1",
          "User 1",
        ),
      ).rejects.toThrow(
        new AppError("AI Analysis is currently unavailable.", 503),
      );
    });

    it("Should throw 503 AppError if ML service returns non-200 status", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(
        triggerAnalysis(
          { id: "acc-123", external_id: "ext-uuid-123" },
          "user-1",
          "User 1",
        ),
      ).rejects.toThrow(
        new AppError("AI Analysis is currently unavailable.", 503),
      );
    });
  });
});
