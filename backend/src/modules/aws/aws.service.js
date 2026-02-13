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
import dayjs from "dayjs";

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

export const ceGetCostAndUsage = async (
  teamId,
  accId,
  startDate = dayjs().subtract(1, "month").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  console.log(accId);
  const account = await awsModel.findAwsAccount(accId, teamId);

  if (!account) throw new AppError("Account not initialized", 404);

  const result = await getCostAndUsage(account, startDate, endDate);

  let rowsAdded = 0;
  await Promise.all(
    result.map(async (row) => {
      const data = {
        awsAccountId: accId,
        timePeriodStart: row.timePeriodStart,
        timePeriodEnd: row.timePeriodEnd,
        service: row.Keys[0],
        region: row.Keys[1],
        unblendedCost: row.Metrics.UnblendedCost.Amount,
        unblendedUnit: row.Metrics.UnblendedCost.Unit,
        usageQuantity: row.Metrics.UsageQuantity.Amount,
        usageQuantityUnit: row.Metrics.UsageQuantity.Unit,
      };

      await awsModel.addCostExploreCostAndUsageRow(data);
      rowsAdded += 1;
    }),
  );

  return rowsAdded;
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
