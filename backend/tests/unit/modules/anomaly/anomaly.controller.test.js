import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/anomaly/anomaly.service.js");
jest.mock("#modules/auth/auth.model.js");
import * as anomalyService from "#modules/anomaly/anomaly.service.js";
import * as authModel from "#modules/auth/auth.model.js";
import {
  getAnomalies,
  triggerAnalysis,
  getAnalysisStatus,
} from "#modules/anomaly/anomaly.controller.js";

describe("Anomaly Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      awsAccount: { id: "acc-123" }, // Injected by AWS Middleware
      userId: "user-1",
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
    it("Should return 202 and async start result", async () => {
      const mockResult = { status: "success" };
      anomalyService.triggerAnalysisAsync.mockResolvedValue(mockResult);
      authModel.findUserById.mockResolvedValue({
        first_name: "User",
        last_name: "1",
        email: "user1@test.com",
      });

      await triggerAnalysis(req, res, next);

      expect(anomalyService.triggerAnalysisAsync).toHaveBeenCalledWith(
        { id: "acc-123" },
        "user-1",
        "User 1",
      );
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.send).toHaveBeenCalledWith(mockResult);
    });

    it("Should call next(error) if service fails", async () => {
      const error = new Error("Service failed");
      anomalyService.triggerAnalysisAsync.mockRejectedValue(error);

      await triggerAnalysis(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getAnalysisStatus", () => {
    it("Should return 200 and status payload", async () => {
      anomalyService.getAnalysisStatus.mockReturnValue({ state: "idle" });
      await getAnalysisStatus(req, res, next);
      expect(anomalyService.getAnalysisStatus).toHaveBeenCalledWith("acc-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ state: "idle" });
    });
  });
});
