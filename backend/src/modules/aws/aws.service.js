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

export const deactivateAwsAccount = async (teamId, internalAccId) => {
  const account = await awsModel.findAwsAccountById(internalAccId);

  if (!account || account.team_id !== teamId) {
    throw new AppError("Account not found or access denied", 404);
  }

  const result = await awsModel.deactivateAwsAccount(internalAccId);
  return result;
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

/**
 * Trigger a Cost Explorer sync for the given account + date range.
 * Upserts rows into cost_explorer_cache (ON CONFLICT DO UPDATE in the model).
 * Returns both rowsAdded count AND the freshly cached rows so the
 * frontend can render immediately without a second round-trip.
 *
 * NOTE: accId here is the internal UUID (aws_accounts.id), NOT the
 * 12-digit AWS account ID. The route /:accId carries the internal UUID.
 */
export const ceGetCostAndUsage = async (
  teamId,
  accId,
  startDate = dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  // Look up by internal UUID — the frontend sends aws_accounts.id
  const account = await awsModel.findAwsAccountById(accId);

  if (!account) throw new AppError("Account not found", 404);

  // Ownership check — make sure this account belongs to the requesting team
  if (account.team_id !== teamId) {
    throw new AppError("Account not found or access denied", 403);
  }

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

  // After upserting, read back the full cached rows for this date window
  // so the frontend gets data in a single round-trip — no second request needed.
  const rows = await awsModel.getCachedCostData(account.id, startDate, endDate);

  return { rowsAdded, data: rows ?? [] };
};

/**
 * Read cached Cost Explorer rows from the DB — no AWS API call.
 * The frontend calls this endpoint for normal page loads / date range changes
 * after the initial sync has already populated the cache.
 *
 * accId is the internal UUID (aws_accounts.id).
 */
export const getCachedCostData = async (
  teamId,
  accId,
  startDate = dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  const account = await awsModel.findAwsAccountById(accId);

  if (!account) throw new AppError("Account not found", 404);

  if (account.team_id !== teamId) {
    throw new AppError("Account not found or access denied", 403);
  }

  const rows = await awsModel.getCachedCostData(account.id, startDate, endDate);

  if (rows === null) {
    throw new AppError("Failed to retrieve cached cost data", 500);
  }

  return rows;
};
