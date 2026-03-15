import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/anomaly/anomaly.service.js");
import * as anomalyService from "#modules/anomaly/anomaly.service.js";
import {
  getAnomalies,
  triggerAnalysis,
} from "#modules/anomaly/anomaly.controller.js";

describe("Anomaly Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      awsAccount: { id: "acc-123" }, // Injected by AWS Middleware
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("getAnomalies", () => {
    it("Should return 200 and anomalies data", async () => {
      const mockData = [{ id: "1" }];
      anomalyService.getAnomalies.mockResolvedValue(mockData);

      await getAnomalies(req, res, next);

      expect(anomalyService.getAnomalies).toHaveBeenCalledWith({
        id: "acc-123",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ anomalies: mockData });
    });

    it("Should call next(error) if service fails", async () => {
      const error = new Error("Service failed");
      anomalyService.getAnomalies.mockRejectedValue(error);

      await getAnomalies(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("triggerAnalysis", () => {
    it("Should return 200 and analysis result", async () => {
      const mockResult = { status: "success" };
      anomalyService.triggerAnalysis.mockResolvedValue(mockResult);

      await triggerAnalysis(req, res, next);

      expect(anomalyService.triggerAnalysis).toHaveBeenCalledWith({
        id: "acc-123",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockResult);
    });

    it("Should call next(error) if service fails", async () => {
      const error = new Error("Service failed");
      anomalyService.triggerAnalysis.mockRejectedValue(error);

      await triggerAnalysis(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
