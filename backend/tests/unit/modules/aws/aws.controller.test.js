import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/aws/aws.service.js");
import * as awsService from "#modules/aws/aws.service.js";
import * as awsController from "#modules/aws/aws.controller.js";

describe("AWS Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: { teamId: "team-123", accId: "acc-123" },
      body: {},
      query: {},
      // Simulate the middleware attaching the account
      awsAccount: { id: "acc-123", team_id: "team-123" },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("initializePendingAccount", () => {
    it("Should initialize account and return 200", async () => {
      req.body = { roleArn: "arn:aws:iam::123:role/Test" };
      awsService.initializePendingAccount.mockResolvedValue("mock-script");
      await awsController.initializePendingAccount(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ script: "mock-script" }),
      );
    });
  });

  describe("activateAwsAccount", () => {
    it("Should activate account and return 200", async () => {
      req.body = { roleArn: "arn:aws:iam::123:role/Test" };
      awsService.activateAwsAccount.mockResolvedValue(true);
      await awsController.activateAwsAccount(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ success: true });
    });
  });

  describe("getAwsAccount", () => {
    it("Should get account and return 200", async () => {
      awsService.getAwsAccount.mockResolvedValue({ id: "acc-123" });
      await awsController.getAwsAccount(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ id: "acc-123" });
    });
  });

  describe("ceGetCostAndUsage", () => {
    it("Should trigger Cost Explorer sync and return 200", async () => {
      req.query = { startDate: "2023-01-01", endDate: "2023-01-31" };
      awsService.ceGetCostAndUsage.mockResolvedValue({
        rowsAdded: 5,
        data: [],
      });

      await awsController.ceGetCostAndUsage(req, res, next);

      // Now checking that it passes the FULL req.awsAccount object
      expect(awsService.ceGetCostAndUsage).toHaveBeenCalledWith(
        req.awsAccount,
        "2023-01-01",
        "2023-01-31",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("getCachedCostData", () => {
    it("Should return cached cost data with 200", async () => {
      req.query = { startDate: "2023-01-01", endDate: "2023-01-31" };
      const mockRows = [{ cost: 10 }];
      awsService.getCachedCostData.mockResolvedValue(mockRows);

      await awsController.getCachedCostData(req, res, next);

      // Now checking that it passes JUST the internal ID
      expect(awsService.getCachedCostData).toHaveBeenCalledWith(
        "acc-123",
        "2023-01-01",
        "2023-01-31",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ data: mockRows });
    });
  });

  describe("deactivateAwsAccount", () => {
    it("Should deactivate an account and return 200", async () => {
      awsService.deactivateAwsAccount.mockResolvedValue({
        status: "disconnected",
      });

      await awsController.deactivateAwsAccount(req, res, next);

      // Now checking that it passes JUST the internal ID
      expect(awsService.deactivateAwsAccount).toHaveBeenCalledWith("acc-123");
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
