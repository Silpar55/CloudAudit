import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AppError } from "#utils/helper/AppError.js";

jest.mock("#modules/anomaly/anomaly.model.js");
import * as anomalyModel from "#modules/anomaly/anomaly.model.js";
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
      anomalyModel.getAnomaliesByAccountId.mockResolvedValue(mockAnomalies);

      const result = await getAnomalies("acc-123");
      expect(result).toEqual(mockAnomalies);
      expect(anomalyModel.getAnomaliesByAccountId).toHaveBeenCalledWith(
        "acc-123",
      );
    });

    it("Should throw AppError if model returns null", async () => {
      anomalyModel.getAnomaliesByAccountId.mockResolvedValue(null);
      await expect(getAnomalies("acc-123")).rejects.toThrow(AppError);
    });
  });

  describe("triggerAnalysis", () => {
    it("Should call ML service and return data on success", async () => {
      const mockResponse = { status: "success", anomalies_detected: 2 };
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await triggerAnalysis("acc-123");
      expect(global.fetch).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it("Should throw 503 AppError if ML service is unreachable", async () => {
      global.fetch.mockRejectedValue(new TypeError("fetch failed"));

      await expect(triggerAnalysis("acc-123")).rejects.toThrow(
        new AppError(
          "AI Analysis is currently unavailable. Please try again later.",
          503,
        ),
      );
    });

    it("Should throw 503 AppError if ML service returns non-200 status", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(triggerAnalysis("acc-123")).rejects.toThrow(
        new AppError(
          "AI Analysis is currently unavailable. Please try again later.",
          503,
        ),
      );
    });
  });
});
