/**
 * CloudAudit — Unit tests for `cost-explorer.service`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#utils/aws/sts.js", () => ({
  getTemporaryCredentials: jest.fn(),
}));
jest.mock("#utils/aws/client-factory.js", () => ({
  createCostExplorerClient: jest.fn(),
}));

import { getTemporaryCredentials } from "#utils/aws/sts.js";
import { createCostExplorerClient } from "#utils/aws/client-factory.js";
import { getCostAndUsage } from "#modules/aws/services/cost-explorer.service.js";
import { AppError } from "#utils/helper/AppError.js";

describe("Cost Explorer Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("Should successfully fetch and filter cost and usage data", async () => {
    const mockAccount = { aws_account_id: "123", iam_role_arn: "arn:aws" };
    const mockCredentials = { accessKeyId: "key", secretAccessKey: "secret" };

    getTemporaryCredentials.mockResolvedValue(mockCredentials);

    // FIXED: Matched the exact nested structure your filterCostResults function expects
    const mockSend = jest.fn().mockResolvedValue({
      ResultsByTime: [
        {
          TimePeriod: { Start: "2023-01-01", End: "2023-01-02" },
          Groups: [
            {
              Keys: ["AmazonEC2", "us-east-1"],
              Metrics: {
                UnblendedCost: { Amount: "10.5", Unit: "USD" },
                UsageQuantity: { Amount: "5", Unit: "Hours" },
              },
            },
            {
              Keys: ["AmazonS3", "us-east-1"],
              Metrics: {
                UnblendedCost: { Amount: "0", Unit: "USD" }, // This one should be filtered out
                UsageQuantity: { Amount: "1", Unit: "GB" },
              },
            },
          ],
        },
      ],
    });
    createCostExplorerClient.mockReturnValue({ send: mockSend });

    const result = await getCostAndUsage(
      mockAccount,
      "2023-01-01",
      "2023-01-31",
    );

    expect(getTemporaryCredentials).toHaveBeenCalledWith(mockAccount);
    expect(createCostExplorerClient).toHaveBeenCalledWith(
      "us-east-1",
      mockCredentials,
    );
    expect(mockSend).toHaveBeenCalled();

    // Validates that it filtered out the $0 cost item
    expect(result).toHaveLength(1);
    expect(result[0].timePeriodStart).toBe("2023-01-01");
    expect(result[0].Keys).toEqual(["AmazonEC2", "us-east-1"]);
  });

  it("Should map AccessDenied to 403 AppError", async () => {
    getTemporaryCredentials.mockResolvedValue({});
    const err = new Error("Denied");
    err.name = "AccessDenied";
    createCostExplorerClient.mockReturnValue({
      send: jest.fn().mockRejectedValue(err),
    });

    await expect(
      getCostAndUsage({ aws_account_id: "1" }, "2023-01-01", "2023-01-31"),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: expect.stringContaining("Permission denied"),
    });
  });

  it("Should throw AppError if AWS call fails", async () => {
    getTemporaryCredentials.mockResolvedValue({});
    createCostExplorerClient.mockReturnValue({
      send: jest.fn().mockRejectedValue(new Error("AWS Error")),
    });

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // FIXED: Matched the exact error string thrown by handleCostExplorerError
    await expect(
      getCostAndUsage({}, "2023-01-01", "2023-01-31"),
    ).rejects.toThrow(new AppError("Failed to retrieve cost data", 500));

    consoleErrorSpy.mockRestore();
  });
});
