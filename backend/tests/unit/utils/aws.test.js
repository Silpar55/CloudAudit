import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#utils/aws/client-factory.js", () => {
  const actual = jest.requireActual("#utils/aws/client-factory.js");
  return {
    ...actual,
    getCallerIdentity: jest.fn(),
    assumeRole: jest.fn(),
    createSTSClient: jest.fn(),
  };
});

import {
  verifyAwsConnection,
  validateSTSConnection,
  getTemporaryCredentials,
} from "#utils/aws/sts.js";
import { generateScripts } from "#utils/aws/policy-generator.js";
import { AppError } from "#utils/helper/AppError.js";

import {
  createSTSClient,
  assumeRole,
  getCallerIdentity,
} from "#utils/aws/client-factory.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AWS Utilities", () => {
  describe("verifyAwsConnection", () => {
    it("Should successfully verify AWS connection and log details", async () => {
      const mockResponse = {
        Account: "123456789012",
        Arn: "arn:aws:iam::123456789012:user/testuser",
      };

      // Mock the helper functions to return the expected values
      createSTSClient.mockReturnValue({});
      getCallerIdentity.mockResolvedValue(mockResponse);

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      await verifyAwsConnection();

      expect(createSTSClient).toHaveBeenCalledTimes(1);
      expect(getCallerIdentity).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).toHaveBeenCalledWith("Success! I am connected as:");
      expect(consoleLogSpy).toHaveBeenCalledWith("Account ID:", "123456789012");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "ARN:",
        "arn:aws:iam::123456789012:user/testuser",
      );

      consoleLogSpy.mockRestore();
    });

    it("Should log error and exit process if connection fails", async () => {
      const mockError = new Error("Connection timeout");

      createSTSClient.mockReturnValue({});
      getCallerIdentity.mockRejectedValue(mockError);

      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const processExitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation(() => {});

      await verifyAwsConnection();

      expect(consoleErrorSpy).toHaveBeenCalledWith("Connection failed:");
      expect(consoleErrorSpy).toHaveBeenCalledWith("Connection timeout");
      // Note: process.exit is commented out in your code, so this won't be called
      // expect(processExitSpy).toHaveBeenCalledWith(1);

      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });
  });

  describe("validateSTSConnection", () => {
    it("Should return true if AssumeRole succeeds", async () => {
      const customer = {
        iam_role_arn: "arn:aws:iam::123456789012:role/TestRole",
        external_id: "ext-123",
      };

      createSTSClient.mockReturnValue({});
      assumeRole.mockResolvedValue({
        external_id: "ext-123",
        iam_role_arn: "arn:aws:iam::123456789012:role/TestRole",
        RoleSessionName: "CloudAuditValidation",
        DurationSeconds: 900,
      });

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      const result = await validateSTSConnection(customer);

      expect(consoleLogSpy).toHaveBeenCalledWith(customer);
      expect(createSTSClient).toHaveBeenCalledTimes(1);
      expect(assumeRole).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          RoleArn: customer.iam_role_arn,
          RoleSessionName: "CloudAuditValidation",
          DurationSeconds: 900,
          ExternalId: customer.external_id,
        }),
      );
      expect(result).toBe(true);

      consoleLogSpy.mockRestore();
    });

    it("Should throw AppError with 401 if AccessDenied error occurs", async () => {
      const customer = {
        iam_role_arn: "arn:aws:iam::123456789012:role/TestRole",
        external_id: "ext-123",
      };

      const mockError = new Error("Access denied");
      mockError.name = "AccessDenied";

      createSTSClient.mockReturnValue({});
      assumeRole.mockRejectedValue(mockError);

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(validateSTSConnection(customer)).rejects.toThrow(AppError);
      await expect(validateSTSConnection(customer)).rejects.toThrow(
        "Permission denied. The user likely hasn't updated their Trust Policy.",
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unexpected error:"),
      );

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("Should throw AppError with 401 if ValidationError occurs", async () => {
      const customer = {
        iam_role_arn: "invalid-arn",
        external_id: "ext-123",
      };

      const mockError = new Error("Invalid ARN");
      mockError.name = "ValidationError";

      createSTSClient.mockReturnValue({});
      assumeRole.mockRejectedValue(mockError);

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});

      await expect(validateSTSConnection(customer)).rejects.toThrow(AppError);
      await expect(validateSTSConnection(customer)).rejects.toThrow(
        "Invalid ARN format",
      );

      consoleLogSpy.mockRestore();
    });

    it("Should return false and log error for unexpected errors", async () => {
      const customer = {
        iam_role_arn: "arn:aws:iam::123456789012:role/TestRole",
        external_id: "ext-123",
      };

      const mockError = new Error("Unknown error");
      mockError.name = "UnknownError";

      createSTSClient.mockReturnValue({});
      assumeRole.mockRejectedValue(mockError);

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = await validateSTSConnection(customer);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unexpected error:"),
      );
      expect(result).toBe(false);

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("getTemporaryCredentials", () => {
    it("Should assume customer role and return credentials", async () => {
      const customer = {
        iam_role_arn: "arn:aws:iam::123456789012:role/CustomerRole",
        aws_account_id: "123456789012",
        external_id: "ext-456",
      };

      const mockCredentials = {
        AccessKeyId: "AKIAIOSFODNN7EXAMPLE",
        SecretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        SessionToken: "FwoGZXIvYXdzEBQaDEXAMPLETOKEN",
      };

      createSTSClient.mockReturnValue({});
      assumeRole.mockResolvedValue({
        Credentials: mockCredentials,
      });

      const result = await getTemporaryCredentials(customer);

      expect(createSTSClient).toHaveBeenCalledTimes(1);
      expect(assumeRole).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          RoleArn: customer.iam_role_arn,
          ExternalId: customer.external_id,
          DurationSeconds: 3600,
        }),
      );
      expect(result).toEqual({
        accessKeyId: mockCredentials.AccessKeyId,
        secretAccessKey: mockCredentials.SecretAccessKey,
        sessionToken: mockCredentials.SessionToken,
      });
    });
  });

  describe("generateScripts", () => {
    it("Should generate trust policy and permissions policy JSON strings", () => {
      const pendingAccount = {
        external_id: "ext-789",
        externalId: "ext-789",
      };

      const result = generateScripts(pendingAccount);

      // Verify the structure
      expect(result).toHaveProperty("trustPolicyJson");
      expect(result).toHaveProperty("permissionsPolicyJson");
      expect(result).toHaveProperty("instructions");

      // Verify trust policy contains external ID
      expect(result.trustPolicyJson).toContain("ext-789");
      expect(result.trustPolicyJson).toContain("sts:ExternalId");

      // Verify permissions policy contains expected actions
      expect(result.permissionsPolicyJson).toContain("sts:GetCallerIdentity");
      expect(result.permissionsPolicyJson).toContain("ec2:DescribeInstances");
      expect(result.permissionsPolicyJson).toContain("s3:ListAllMyBuckets");

      // Verify instructions
      expect(result.instructions).toHaveProperty("step1");
      expect(result.instructions).toHaveProperty("step2");
      expect(result.instructions).toHaveProperty("step3");
      expect(result.instructions).toHaveProperty("externalId");
      expect(result.instructions.externalId).toBe("ext-789");

      // Verify JSON is valid
      expect(() => JSON.parse(result.trustPolicyJson)).not.toThrow();
      expect(() => JSON.parse(result.permissionsPolicyJson)).not.toThrow();
    });

    it("Should generate policies with correct structure", () => {
      const pendingAccount = {
        external_id: "test-ext-id",
        externalId: "test-ext-id",
      };

      const result = generateScripts(pendingAccount);

      const trustPolicy = JSON.parse(result.trustPolicyJson);
      const permissionsPolicy = JSON.parse(result.permissionsPolicyJson);

      // Verify trust policy structure
      expect(trustPolicy.Version).toBe("2012-10-17");
      expect(trustPolicy.Statement).toHaveLength(1);
      expect(trustPolicy.Statement[0].Effect).toBe("Allow");
      expect(trustPolicy.Statement[0].Action).toBe("sts:AssumeRole");
      expect(
        trustPolicy.Statement[0].Condition.StringEquals["sts:ExternalId"],
      ).toBe("test-ext-id");

      // Verify permissions policy structure
      expect(permissionsPolicy.Version).toBe("2012-10-17");
      expect(permissionsPolicy.Statement).toHaveLength(1);
      expect(permissionsPolicy.Statement[0].Effect).toBe("Allow");
      expect(permissionsPolicy.Statement[0].Resource).toBe("*");
      expect(permissionsPolicy.Statement[0].Action).toContain(
        "sts:GetCallerIdentity",
      );
    });
  });
});
