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
import {
  ensurePlatformCredentials,
  getPlatformStsCredentials,
} from "./platform-credentials.js";

const REGION = process.env.AWS_REGION || "us-east-1";

export const verifyAwsConnection = async () => {
  try {
    await ensurePlatformCredentials();
    const creds = await getPlatformStsCredentials();
    const client = createSTSClient(REGION, creds);

    const response = await getCallerIdentity(client);

    console.log("Success! I am connected as:");
    console.log("Account ID:", response.Account);
    console.log("ARN:", response.Arn);
  } catch (err) {
    console.error("Connection failed:");
    console.error(err.message);
    if (
      err.name === "AccessDenied" ||
      /AssumeRole|not authorized|is not authorized/i.test(String(err.message))
    ) {
      console.error(
        "Hint: Your default AWS identity (e.g. SSO) must be allowed to sts:AssumeRole the platform role in CLOUDAUDIT_PLATFORM_MODE. Re-run create-cloudaudit-platform-roles.sh with DEV_ASSUMER_ARNS including your SSO role ARN.",
      );
    }
  }
};

export const validateSTSConnection = async (account) => {
  await ensurePlatformCredentials();
  const creds = await getPlatformStsCredentials();
  const client = createSTSClient(REGION, creds);

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
        403,
      );
    } else if (error.name === "ValidationError") {
      console.log(error);
      throw new AppError("Invalid ARN format", 400);
    } else {
      console.error(`Unexpected error: ${error.message}`);
    }
    return false;
  }
};

export const getTemporaryCredentials = async (account) => {
  await ensurePlatformCredentials();
  const creds = await getPlatformStsCredentials();
  const sts = createSTSClient(REGION, creds);

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
