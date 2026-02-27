import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the entire service to avoid undefined reference errors
jest.mock("#modules/aws/aws.service.js", () => ({
  initializePendingAccount: jest.fn(),
  activateAwsAccount: jest.fn(),
  getAwsAccount: jest.fn(),
  ceGetCostAndUsage: jest.fn(),
  getCachedCostData: jest.fn(),
  deactivateAwsAccount: jest.fn(),
}));

import * as awsService from "#modules/aws/aws.service.js";
import * as awsController from "#modules/aws/aws.controller.js";

describe("AWS Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, query: {}, userId: "user-123" };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("initializePendingAccount", () => {
    it("Should initialize account and return 200 with script", async () => {
      req.body = { roleArn: "arn:aws:iam::123456789012:role/Role" };
      req.params = { teamId: "team-123" };

      const mockScript = { instructions: "Follow these steps" };
      awsService.initializePendingAccount.mockResolvedValue(mockScript);

      await awsController.initializePendingAccount(req, res, next);

      expect(awsService.initializePendingAccount).toHaveBeenCalledWith(
        "team-123",
        req.body.roleArn,
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("activateAwsAccount", () => {
    it("Should activate account and return 200", async () => {
      req.body = { roleArn: "arn:aws:iam::123456789012:role/Role" };
      req.params = { teamId: "team-123" };

      awsService.activateAwsAccount.mockResolvedValue(true);

      await awsController.activateAwsAccount(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getAwsAccount", () => {
    it("Should fetch the AWS account and return 200", async () => {
      req.params = { teamId: "team-123" };
      const mockAccount = { id: "internal-123", status: "active" };

      awsService.getAwsAccount.mockResolvedValue(mockAccount);

      await awsController.getAwsAccount(req, res, next);

      expect(awsService.getAwsAccount).toHaveBeenCalledWith("team-123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockAccount);
    });

    it("Should pass errors to next()", async () => {
      const error = new Error("Not found");
      awsService.getAwsAccount.mockRejectedValue(error);
      await awsController.getAwsAccount(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("ceGetCostAndUsage", () => {
    it("Should trigger Cost Explorer sync and return 200", async () => {
      req.params = { teamId: "team-123", accId: "acc-123" };
      req.query = { startDate: "2023-01-01", endDate: "2023-01-31" };

      const mockResult = { rowsAdded: 5, data: [] };
      awsService.ceGetCostAndUsage.mockResolvedValue(mockResult);

      await awsController.ceGetCostAndUsage(req, res, next);

      expect(awsService.ceGetCostAndUsage).toHaveBeenCalledWith(
        "team-123",
        "acc-123",
        "2023-01-01",
        "2023-01-31",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getCachedCostData", () => {
    it("Should return cached cost data with 200", async () => {
      req.params = { teamId: "team-123", accId: "acc-123" };
      req.query = { startDate: "2023-01-01", endDate: "2023-01-31" };

      const mockRows = [{ cost: 100 }];
      awsService.getCachedCostData.mockResolvedValue(mockRows);

      await awsController.getCachedCostData(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ data: mockRows });
    });
  });

  describe("deactivateAwsAccount", () => {
    it("Should deactivate an account and return 200", async () => {
      req.params = { teamId: "team-123", accId: "acc-123" };
      awsService.deactivateAwsAccount.mockResolvedValue({ id: "acc-123" });

      await awsController.deactivateAwsAccount(req, res, next);

      expect(awsService.deactivateAwsAccount).toHaveBeenCalledWith(
        "team-123",
        "acc-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
