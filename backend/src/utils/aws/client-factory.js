/**
 * AWS Client Factory
 *
 * Purpose: Create AWS SDK clients with proper configuration
 * Why: Centralized client creation makes testing easier (mockable)
 *
 * This replaces aws-helper.js with better naming and organization
 */

import {
  STSClient,
  GetCallerIdentityCommand,
  AssumeRoleCommand,
} from "@aws-sdk/client-sts";

import { CostExplorerClient } from "@aws-sdk/client-cost-explorer";

import { S3Client } from "@aws-sdk/client-s3";

import { EC2Client } from "@aws-sdk/client-ec2";

export const createSTSClient = (region = "us-east-1", credentials = null) => {
  const config = { region };
  if (credentials) {
    config.credentials = credentials;
  }
  return new STSClient(config);
};

export const createCostExplorerClient = (region = "us-east-1", credentials) => {
  return new CostExplorerClient({
    region,
    credentials,
  });
};

export const createS3Client = (region = "us-east-1", credentials) => {
  return new S3Client({
    region,
    credentials,
  });
};

export const createEC2Client = (region = "us-east-1", credentials) => {
  return new EC2Client({
    region,
    credentials,
  });
};

export const getCallerIdentity = async (client) => {
  const command = new GetCallerIdentityCommand({});
  return await client.send(command);
};

export const assumeRole = async (client, params) => {
  const command = new AssumeRoleCommand(params);
  return await client.send(command);
};
