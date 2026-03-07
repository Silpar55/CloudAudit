import { validRoleARN } from "#utils/validation.js";
import { AppError } from "#utils/helper/AppError.js";
import { randomUUID } from "crypto";
import dayjs from "dayjs";

import * as awsModel from "./aws.model.js";
import * as teamModel from "../team/team.model.js";

import { validateSTSConnection } from "#utils/aws/sts.js";
import { generateScripts } from "#utils/aws/policy-generator.js";
import { getCostAndUsage } from "./services/cost-explorer.service.js";

export const initializePendingAccount = async (teamId, roleArn) => {
  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  const accId = roleArn.split(":")[4];

  let pendingAccount = await awsModel.findAwsAccountByAccId(accId, teamId);

  if (!pendingAccount) {
    pendingAccount = await awsModel.initializePendingAccount({
      roleArn,
      externalId: randomUUID(),
      accId,
      teamId,
    });
  } else {
    pendingAccount = await awsModel.updateAccountRole(
      pendingAccount.id,
      roleArn,
    );
  }

  return generateScripts(pendingAccount);
};

export const activateAwsAccount = async (teamId, roleArn) => {
  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  const accId = roleArn.split(":")[4];

  const account = await awsModel.findAwsAccountByAccId(accId, teamId);

  if (!account) throw new AppError("Account not initialized", 404);

  const isValid = await validateSTSConnection(account);

  if (!isValid)
    throw new AppError("Validation Failed: Check Trust Policy", 400);

  await awsModel.activateAwsAccount(account.id);

  await teamModel.updateTeamStatus(teamId, "active");

  return true;
};

/**
 * Get the AWS account record for a team.
 * Used by the dashboard on first load to retrieve the internal UUID.
 */
export const getAwsAccount = async (teamId) => {
  const account = await awsModel.getAwsAccountByTeamId(teamId);

  if (!account) throw new AppError("No AWS account found for this team", 404);

  // Strip the IAM role ARN and external ID before returning to the client —
  // the frontend only needs the id, aws_account_id, status, and timestamps.
  const { iam_role_arn, external_id, ...safeAccount } = account;
  return safeAccount;
};

export const deactivateAwsAccount = async (internalAccId) => {
  // Redundant DB query and ownership check removed!
  const result = await awsModel.deactivateAwsAccount(internalAccId);
  return result;
};

export const ceGetCostAndUsage = async (
  account, // Now expects the full account object from the controller
  startDate = dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  const result = await getCostAndUsage(account, startDate, endDate);

  let rowsAdded = 0;
  await Promise.all(
    result.map(async (row) => {
      const data = {
        awsAccountId: account.id,
        timePeriodStart: row.timePeriodStart,
        timePeriodEnd: row.timePeriodEnd,
        service: row.Keys[0],
        region: row.Keys[1],
        unblendedCost: row.Metrics.UnblendedCost.Amount,
        unblendedUnit: row.Metrics.UnblendedCost.Unit,
        usageQuantity: row.Metrics.UsageQuantity.Amount,
        usageQuantityUnit: row.Metrics.UsageQuantity.Unit,
      };

      const inserted = await awsModel.addCostExploreCostAndUsageRow(data);
      if (inserted) rowsAdded += 1;
    }),
  );

  const rows = await awsModel.getCachedCostData(account.id, startDate, endDate);

  return { rowsAdded, data: rows ?? [] };
};

export const getCachedCostData = async (
  internalId, // Now expects just the string ID from the controller
  startDate = dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  const rows = await awsModel.getCachedCostData(internalId, startDate, endDate);

  if (rows === null) {
    throw new AppError("Failed to retrieve cached cost data", 500);
  }

  return rows;
};
