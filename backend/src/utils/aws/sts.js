/**
 * AWS STS (Security Token Service) Operations
 *
 * Purpose: Handle all STS-related operations (assume role, validate connections)
 * Responsibilities:
 * - Validate AWS connections
 * - Assume customer roles
 * - Get temporary credentials
 */

import { AppError } from "../helper/AppError.js";
import {
  createSTSClient,
  getCallerIdentity,
  assumeRole,
} from "./client-factory.js";

export const verifyAwsConnection = async () => {
  const client = createSTSClient();

  try {
    const response = await getCallerIdentity(client);

    console.log("Success! I am connected as:");
    console.log("Account ID:", response.Account);
    console.log("ARN:", response.Arn);
  } catch (err) {
    console.error("Connection failed:");
    console.error(err.message);
  }
};

export const validateSTSConnection = async (account) => {
  const client = createSTSClient();

  console.log(account);

  try {
    const params = {
      RoleArn: account.iam_role_arn,
      RoleSessionName: "CloudAuditValidation",
      DurationSeconds: 900,
      ExternalId: account.external_id,
    };

    await assumeRole(client, params);

    return true;
  } catch (error) {
    if (error.name === "AccessDenied") {
      console.error(`Unexpected error: ${error.message}`);
      throw new AppError(
        "Permission denied. The user likely hasn't updated their Trust Policy.",
        401,
      );
    } else if (error.name === "ValidationError") {
      console.log(error);
      throw new AppError("Invalid ARN format", 401);
    } else {
      console.error(`Unexpected error: ${error.message}`);
    }
    return false;
  }
};

export const getTemporaryCredentials = async (account) => {
  const sts = createSTSClient();

  const params = {
    RoleArn: account.iam_role_arn,
    RoleSessionName: `cust-${account.aws_account_id}-${Date.now()}`,
    ExternalId: account.external_id,
    DurationSeconds: 3600,
  };

  const { Credentials } = await assumeRole(sts, params);

  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken,
  };
};
