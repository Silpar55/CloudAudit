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

  let pendingAccount = await awsModel.findAwsAccountByAwsId(accId, teamId);

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

  const account = await awsModel.findAwsAccountByAwsId(accId, teamId);

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

// ... existing ceGetCostAndUsage (make sure it passes account.id if needed, currently it uses accId string which is fine if logic holds) ...
export const ceGetCostAndUsage = async (
  teamId,
  accId,
  startDate = dayjs().subtract(1, "month").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  const account = await awsModel.findAwsAccountById(accId, teamId);

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
