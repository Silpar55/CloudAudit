import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/aws/aws.model.js");
jest.mock("#modules/team/team.model.js");
jest.mock("#utils/aws/sts.js");
jest.mock("#utils/aws/policy-generator.js");
jest.mock("#modules/aws/services/cost-explorer.service.js"); // Mocking inner CE service

import {
  initializePendingAccount,
  activateAwsAccount,
  deactivateAwsAccount,
  getAwsAccount,
  ceGetCostAndUsage,
  getCachedCostData,
} from "#modules/aws/aws.service.js";
import * as awsModel from "#modules/aws/aws.model.js";
import * as teamModel from "#modules/team/team.model.js";
import { validateSTSConnection } from "#utils/aws/sts.js";
import { generateScripts } from "#utils/aws/policy-generator.js";
import { getCostAndUsage } from "#modules/aws/services/cost-explorer.service.js";
import { AppError } from "#utils/helper/AppError.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AWS Service", () => {
  const mockRoleArn = "arn:aws:iam::123456789012:role/MyRole";

  describe("initializePendingAccount", () => {
    it("Should initialize a new pending account if it doesn't exist", async () => {
      awsModel.findAwsAccountByAccId.mockResolvedValue(null);
      awsModel.initializePendingAccount.mockResolvedValue({ id: "123" });
      generateScripts.mockReturnValue({ instructions: "Step 1" });

      await initializePendingAccount("team-1", mockRoleArn);
      expect(awsModel.initializePendingAccount).toHaveBeenCalled();
    });

    it("Should update the role ARN if the pending account already exists", async () => {
      awsModel.findAwsAccountByAccId.mockResolvedValue({ id: "123" });
      awsModel.updateAccountRole.mockResolvedValue({
        id: "123",
        iam_role_arn: mockRoleArn,
      });
      generateScripts.mockReturnValue({ instructions: "Step 1" });

      await initializePendingAccount("team-1", mockRoleArn);
      expect(awsModel.updateAccountRole).toHaveBeenCalledWith(
        "123",
        mockRoleArn,
      );
      expect(awsModel.initializePendingAccount).not.toHaveBeenCalled();
    });
  });

  describe("activateAwsAccount", () => {
    it("Should activate account and update team status on success", async () => {
      awsModel.findAwsAccountByAccId.mockResolvedValue({ id: "123" });
      validateSTSConnection.mockResolvedValue(true);

      const result = await activateAwsAccount("team-1", mockRoleArn);
      expect(awsModel.activateAwsAccount).toHaveBeenCalledWith("123");
      expect(teamModel.updateTeamStatus).toHaveBeenCalledWith(
        "team-1",
        "active",
      );
      expect(result).toBe(true);
    });
  });

  describe("deactivateAwsAccount", () => {
    it("Should throw AppError if account not found or wrong team", async () => {
      awsModel.findAwsAccountById.mockResolvedValue({ team_id: "wrong-team" });
      await expect(deactivateAwsAccount("team-1", "acc-123")).rejects.toThrow(
        new AppError("Account not found or access denied", 404),
      );
    });

    it("Should deactivate account successfully", async () => {
      awsModel.findAwsAccountById.mockResolvedValue({ team_id: "team-1" });
      awsModel.deactivateAwsAccount.mockResolvedValue({
        status: "disconnected",
      });
      const result = await deactivateAwsAccount("team-1", "acc-123");
      expect(result.status).toBe("disconnected");
    });
  });

  describe("getAwsAccount", () => {
    it("Should throw AppError if no account exists for the team", async () => {
      awsModel.getAwsAccountByTeamId.mockResolvedValue(null);
      await expect(getAwsAccount("team-1")).rejects.toThrow(AppError);
    });

    it("Should return account stripped of sensitive fields", async () => {
      awsModel.getAwsAccountByTeamId.mockResolvedValue({
        id: "123",
        iam_role_arn: "secret-arn",
        external_id: "secret-id",
        status: "active",
      });
      const result = await getAwsAccount("team-1");
      expect(result.iam_role_arn).toBeUndefined();
      expect(result.external_id).toBeUndefined();
      expect(result.id).toBe("123");
    });
  });

  describe("ceGetCostAndUsage", () => {
    it("Should throw AppError if account not found", async () => {
      awsModel.findAwsAccountById.mockResolvedValue(null);
      await expect(ceGetCostAndUsage("team-1", "acc-123")).rejects.toThrow(
        AppError,
      );
    });

    it("Should throw AppError if team mismatch", async () => {
      awsModel.findAwsAccountById.mockResolvedValue({ team_id: "wrong" });
      await expect(ceGetCostAndUsage("team-1", "acc-123")).rejects.toThrow(
        AppError,
      );
    });

    it("Should sync cost data and return inserted rows", async () => {
      awsModel.findAwsAccountById.mockResolvedValue({
        id: "acc-123",
        team_id: "team-1",
      });
      getCostAndUsage.mockResolvedValue([
        {
          timePeriodStart: "2023-01-01",
          timePeriodEnd: "2023-01-02",
          Keys: ["AmazonEC2", "us-east-1"],
          Metrics: {
            UnblendedCost: { Amount: "10", Unit: "USD" },
            UsageQuantity: { Amount: "5", Unit: "Hrs" },
          },
        },
      ]);
      awsModel.addCostExploreCostAndUsageRow.mockResolvedValue(true);
      awsModel.getCachedCostData.mockResolvedValue([{ cached: true }]);

      const result = await ceGetCostAndUsage(
        "team-1",
        "acc-123",
        "2023-01-01",
        "2023-01-02",
      );
      expect(awsModel.addCostExploreCostAndUsageRow).toHaveBeenCalled();
      expect(result.rowsAdded).toBe(1);
      expect(result.data).toEqual([{ cached: true }]);
    });
  });

  describe("getCachedCostData", () => {
    it("Should throw AppError if caching failed (returns null)", async () => {
      awsModel.findAwsAccountById.mockResolvedValue({ team_id: "team-1" });
      awsModel.getCachedCostData.mockResolvedValue(null);
      await expect(getCachedCostData("team-1", "acc-123")).rejects.toThrow(
        new AppError("Failed to retrieve cached cost data", 500),
      );
    });

    it("Should successfully return cached rows", async () => {
      awsModel.findAwsAccountById.mockResolvedValue({ team_id: "team-1" });
      awsModel.getCachedCostData.mockResolvedValue([{ cost: 100 }]);
      const result = await getCachedCostData("team-1", "acc-123");
      expect(result).toEqual([{ cost: 100 }]);
    });
  });
});
