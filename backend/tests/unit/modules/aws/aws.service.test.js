import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { AppError } from "#utils/helper/AppError.js";

// Mock dependencies
jest.mock("#modules/aws/aws.model.js");
jest.mock("../../../../src/modules/team/team.model.js");
jest.mock("#utils/aws/sts.js");
jest.mock("#utils/aws/policy-generator.js");
jest.mock("../../../../src/modules/aws/services/cost-explorer.service.js");

import * as awsModel from "#modules/aws/aws.model.js";
import * as teamModel from "../../../../src/modules/team/team.model.js";
import { validateSTSConnection } from "#utils/aws/sts.js";
import { generateScripts } from "#utils/aws/policy-generator.js";
import { getCostAndUsage } from "../../../../src/modules/aws/services/cost-explorer.service.js";

import {
  initializePendingAccount,
  activateAwsAccount,
  deactivateAwsAccount,
  getAwsAccount,
  ceGetCostAndUsage,
  getCachedCostData,
} from "#modules/aws/aws.service.js";

describe("AWS Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initializePendingAccount", () => {
    it("Should initialize a new pending account", async () => {
      awsModel.findAwsAccountByAccId.mockResolvedValue(null);
      awsModel.initializePendingAccount.mockResolvedValue({ id: "acc-123" });
      generateScripts.mockReturnValue("bash-script");

      const result = await initializePendingAccount(
        "team-1",
        "arn:aws:iam::123456789012:role/Test",
      );

      expect(result).toBe("bash-script");
      expect(awsModel.initializePendingAccount).toHaveBeenCalled();
    });

    it("Should throw AppError if role ARN is invalid", async () => {
      await expect(
        initializePendingAccount("team-1", "invalid-arn"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("activateAwsAccount", () => {
    it("Should activate account if STS validation passes", async () => {
      awsModel.findAwsAccountByAccId.mockResolvedValue({ id: "acc-123" });
      validateSTSConnection.mockResolvedValue(true);
      awsModel.activateAwsAccount.mockResolvedValue({ id: "acc-123" });
      teamModel.updateTeamStatus.mockResolvedValue(true);

      const result = await activateAwsAccount(
        "team-1",
        "arn:aws:iam::123456789012:role/Test",
      );

      expect(result).toBe(true);
      expect(awsModel.activateAwsAccount).toHaveBeenCalledWith("acc-123");
    });

    it("Should throw AppError if STS validation fails", async () => {
      awsModel.findAwsAccountByAccId.mockResolvedValue({ id: "acc-123" });
      validateSTSConnection.mockResolvedValue(false);

      await expect(
        activateAwsAccount("team-1", "arn:aws:iam::123456789012:role/Test"),
      ).rejects.toThrow(AppError);
    });
  });

  describe("getAwsAccount", () => {
    it("Should return safe account data", async () => {
      awsModel.getAwsAccountByTeamId.mockResolvedValue({
        id: "acc-123",
        iam_role_arn: "secret",
        external_id: "secret",
        status: "active",
      });

      const result = await getAwsAccount("team-1");
      expect(result).toEqual({ id: "acc-123", status: "active" }); // Secrets stripped
    });

    it("Should throw AppError if no account found", async () => {
      awsModel.getAwsAccountByTeamId.mockResolvedValue(null);
      await expect(getAwsAccount("team-1")).rejects.toThrow(AppError);
    });
  });

  describe("deactivateAwsAccount", () => {
    it("Should successfully deactivate an account", async () => {
      awsModel.deactivateAwsAccount.mockResolvedValue({
        id: "acc-123",
        status: "disconnected",
      });

      const result = await deactivateAwsAccount("acc-123");

      expect(awsModel.deactivateAwsAccount).toHaveBeenCalledWith("acc-123");
      expect(result.status).toBe("disconnected");
    });
  });

  describe("ceGetCostAndUsage", () => {
    it("Should fetch from AWS and upsert into cache", async () => {
      const mockAccount = { id: "acc-123", aws_account_id: "123456789012" };
      const mockResult = [
        {
          timePeriodStart: "2023-01-01",
          timePeriodEnd: "2023-01-02",
          Keys: ["AmazonEC2", "us-east-1"],
          Metrics: {
            UnblendedCost: { Amount: "10", Unit: "USD" },
            UsageQuantity: { Amount: "5", Unit: "Hrs" },
          },
        },
      ];
      getCostAndUsage.mockResolvedValue(mockResult);
      awsModel.addCostExploreCostAndUsageRow.mockResolvedValue(true);
      awsModel.getCachedCostData.mockResolvedValue([{ cost: 10 }]);

      const result = await ceGetCostAndUsage(
        mockAccount,
        "2023-01-01",
        "2023-01-02",
      );

      expect(getCostAndUsage).toHaveBeenCalledWith(
        mockAccount,
        "2023-01-01",
        "2023-01-02",
      );
      expect(awsModel.addCostExploreCostAndUsageRow).toHaveBeenCalled();
      expect(result.rowsAdded).toBe(1);
      expect(result.data).toEqual([{ cost: 10 }]);
    });
  });

  describe("getCachedCostData", () => {
    it("Should return cached data successfully", async () => {
      awsModel.getCachedCostData.mockResolvedValue([{ cost: 10 }]);
      const result = await getCachedCostData(
        "acc-123",
        "2023-01-01",
        "2023-01-02",
      );
      expect(result).toEqual([{ cost: 10 }]);
    });

    it("Should throw AppError if DB fetch fails", async () => {
      awsModel.getCachedCostData.mockResolvedValue(null);
      await expect(
        getCachedCostData("acc-123", "2023-01-01", "2023-01-02"),
      ).rejects.toThrow(AppError);
    });
  });
});
