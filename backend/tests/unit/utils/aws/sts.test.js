import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#utils/aws/client-factory.js", () => ({
  createSTSClient: jest.fn(),
  getCallerIdentity: jest.fn(),
  assumeRole: jest.fn(),
}));

import {
  verifyAwsConnection,
  validateSTSConnection,
  getTemporaryCredentials,
} from "#utils/aws/sts.js";
import { AppError } from "#utils/helper/AppError.js";
import {
  createSTSClient,
  getCallerIdentity,
  assumeRole,
} from "#utils/aws/client-factory.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("STS Operations", () => {
  describe("verifyAwsConnection", () => {
    it("Should verify connection and log details", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      createSTSClient.mockReturnValue({});
      getCallerIdentity.mockResolvedValue({
        Account: "123",
        Arn: "arn:aws:user",
      });

      await verifyAwsConnection();

      expect(consoleLogSpy).toHaveBeenCalledWith("Success! I am connected as:");
      expect(consoleLogSpy).toHaveBeenCalledWith("Account ID:", "123");
      consoleLogSpy.mockRestore();
    });

    it("Should log error if connection fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      createSTSClient.mockReturnValue({});
      getCallerIdentity.mockRejectedValue(new Error("Timeout"));

      await verifyAwsConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith("Connection failed:");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Timeout");
      consoleErrorSpy.mockRestore();
    });
  });

  describe("validateSTSConnection", () => {
    const customer = { iam_role_arn: "arn:aws:role", external_id: "ext-123" };

    it("Should return true if AssumeRole succeeds", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      assumeRole.mockResolvedValue({});

      const result = await validateSTSConnection(customer);

      expect(result).toBe(true);
      expect(assumeRole).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          RoleArn: customer.iam_role_arn,
          ExternalId: customer.external_id,
        }),
      );
      consoleLogSpy.mockRestore();
    });

    it("Should throw 403 AppError on AccessDenied", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const error = new Error("Denied");
      error.name = "AccessDenied";
      assumeRole.mockRejectedValue(error);

      await expect(validateSTSConnection(customer)).rejects.toMatchObject({
        statusCode: 403,
      });

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("Should throw 400 AppError on ValidationError", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const error = new Error("Invalid");
      error.name = "ValidationError";
      assumeRole.mockRejectedValue(error);

      await expect(validateSTSConnection(customer)).rejects.toMatchObject({
        statusCode: 400,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe("getTemporaryCredentials", () => {
    it("Should return formatted credentials", async () => {
      assumeRole.mockResolvedValue({
        Credentials: {
          AccessKeyId: "KEY",
          SecretAccessKey: "SECRET",
          SessionToken: "TOKEN",
        },
      });

      const result = await getTemporaryCredentials({
        iam_role_arn: "arn",
        external_id: "ext",
        aws_account_id: "acc",
      });

      expect(result).toEqual({
        accessKeyId: "KEY",
        secretAccessKey: "SECRET",
        sessionToken: "TOKEN",
      });
    });
  });
});
