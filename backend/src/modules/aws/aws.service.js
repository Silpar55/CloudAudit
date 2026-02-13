/**
 * AWS Service Layer (Business Logic)
 *
 * Purpose: Orchestrate AWS operations and business logic
 * Responsibilities:
 * - Validate business rules
 * - Call database models
 * - Call AWS service utilities
 * - Coordinate between different layers
 */

import { validRoleARN } from "#utils/validation.js";
import { AppError } from "#utils/helper/AppError.js";
import { randomUUID } from "crypto";

// Database operations
import * as awsModel from "./aws.model.js";

// AWS utilities
import { validateSTSConnection } from "#utils/aws/sts.js";
import { generateScripts } from "#utils/aws/policy-generator.js";

// AWS service implementations
import { getCostAndUsage } from "./services/cost-explorer.service.js";

export const initializePendingAccount = async (teamId, roleArn) => {
  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  const accId = roleArn.split(":")[4];

  let pendingAccount = await awsModel.findAwsAccount(accId, teamId);

  if (!pendingAccount) {
    pendingAccount = await awsModel.initializePendingAccount({
      roleArn,
      externalId: randomUUID(),
      accId,
      teamId,
    });
  } else {
    pendingAccount = await awsModel.updateAccount(accId, teamId, roleArn);
  }

  return generateScripts(pendingAccount);
};

export const ceGetCostAndUsage = async (teamId, accId) => {
  const account = await awsModel.findAwsAccount(accId, teamId);

  if (!account) throw new AppError("Account not initialized", 404);

  const result = await getCostAndUsage(account);

  return result;
};

export const activateAwsAccount = async (teamId, roleArn) => {
  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  const accId = roleArn.split(":")[4];
  const account = await awsModel.findAwsAccount(accId, teamId);

  if (!account) throw new AppError("Account not initialized", 404);

  const isValid = await validateSTSConnection(account);

  if (!isValid)
    throw new AppError("Validation Failed: Check Trust Policy", 400);

  await awsModel.activateAwsAccount(account.aws_account_id, account.team_id);
};

export const deactivateAwsAccount = async (teamId, accId) => {
  const { aws_account_id } = await awsModel.deactivateAwsAccount(accId, teamId);

  return aws_account_id;
};
