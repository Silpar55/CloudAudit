/**
 * CloudAudit — Unit tests for `client-factory`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the AWS SDKs
jest.mock("@aws-sdk/client-sts", () => ({
  STSClient: jest.fn(),
  GetCallerIdentityCommand: jest.fn(),
  AssumeRoleCommand: jest.fn(),
}));
jest.mock("@aws-sdk/client-cost-explorer", () => ({
  CostExplorerClient: jest.fn(),
}));
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn(),
}));
jest.mock("@aws-sdk/client-ec2", () => ({
  EC2Client: jest.fn(),
}));

import {
  STSClient,
  GetCallerIdentityCommand,
  AssumeRoleCommand,
} from "@aws-sdk/client-sts";
import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";
import { S3Client } from "@aws-sdk/client-s3";
import { EC2Client } from "@aws-sdk/client-ec2";

import {
  createSTSClient,
  createCostExplorerClient,
  createS3Client,
  createEC2Client,
  getCallerIdentity,
  assumeRole,
} from "#utils/aws/client-factory.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AWS Client Factory", () => {
  const mockCredentials = { accessKeyId: "123", secretAccessKey: "abc" };

  describe("Client Creation", () => {
    it("Should create an STSClient without credentials", () => {
      createSTSClient("us-west-2");
      expect(STSClient).toHaveBeenCalledWith({ region: "us-west-2" });
    });

    it("Should create an STSClient with credentials", () => {
      createSTSClient("us-east-1", mockCredentials);
      expect(STSClient).toHaveBeenCalledWith({
        region: "us-east-1",
        credentials: mockCredentials,
      });
    });

    it("Should create a CostExplorerClient", () => {
      createCostExplorerClient("us-east-1", mockCredentials);
      expect(CostExplorerClient).toHaveBeenCalledWith({
        region: "us-east-1",
        credentials: mockCredentials,
      });
    });

    it("Should create an S3Client", () => {
      createS3Client("us-east-1", mockCredentials);
      expect(S3Client).toHaveBeenCalledWith({
        region: "us-east-1",
        credentials: mockCredentials,
      });
    });

    it("Should create an EC2Client", () => {
      createEC2Client("us-east-1", mockCredentials);
      expect(EC2Client).toHaveBeenCalledWith({
        region: "us-east-1",
        credentials: mockCredentials,
      });
    });
  });

  describe("Client Commands", () => {
    it("Should call getCallerIdentity correctly", async () => {
      const mockClient = {
        send: jest.fn().mockResolvedValue("identity-response"),
      };
      const result = await getCallerIdentity(mockClient);

      expect(GetCallerIdentityCommand).toHaveBeenCalledWith({});
      expect(mockClient.send).toHaveBeenCalled();
      expect(result).toBe("identity-response");
    });

    it("Should call assumeRole correctly", async () => {
      const mockClient = { send: jest.fn().mockResolvedValue("role-response") };
      const params = { RoleArn: "arn:test" };
      const result = await assumeRole(mockClient, params);

      expect(AssumeRoleCommand).toHaveBeenCalledWith(params);
      expect(mockClient.send).toHaveBeenCalled();
      expect(result).toBe("role-response");
    });
  });
});
