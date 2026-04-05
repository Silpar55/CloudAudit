/**
 * CloudAudit — Domain service: `aws`.
 * Business rules and orchestration; callers are controllers, jobs, or other services.
 */

import { validRoleARN } from "#utils/validation.js";
import { AppError } from "#utils/helper/AppError.js";
import { randomUUID } from "crypto";
import dayjs from "dayjs";

import * as awsModel from "./aws.model.js";
import * as teamModel from "../team/team.model.js";
import * as curService from "./services/cur.service.js";
import * as costExplorerService from "./services/cost-explorer.service.js";
import * as curSetupService from "./services/cur-setup.service.js";

import { validateSTSConnection } from "#utils/aws/sts.js";
import { generateScripts } from "#utils/aws/policy-generator.js";
import { logger } from "#utils/logger.js";

export const initializePendingAccount = async (teamId, roleArn) => {
  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  const awsAccountNumber = roleArn.split(":")[4];

  let pendingAccount = await awsModel.findAwsAccountByAwsNumber(
    awsAccountNumber,
    teamId,
  );

  if (!pendingAccount) {
    pendingAccount = await awsModel.initializePendingAccount({
      roleArn,
      externalId: randomUUID(),
      awsAccountNumber,
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
  // 1. Validate STS
  const pendingAccount = await awsModel.getAwsAccountByTeamId(teamId);

  if (!pendingAccount) throw new AppError("Account not found", 404);

  // Extract the real AWS Account ID from the final roleArn they pasted
  const realAwsAccountNumber = roleArn.split(":")[4];

  const isValid = await validateSTSConnection({
    iam_role_arn: roleArn,
    external_id: pendingAccount.external_id,
  });

  if (!isValid)
    throw new AppError(
      "STS connection failed. Verify role ARN and external ID.",
      400,
    );

  // 2. Activate the account in DB and ONLY THEN mark team active.
  // This prevents "zombie" workspaces when activation fails (e.g. unique constraint conflict).
  const account = await awsModel.activateAwsAccount(
    pendingAccount.id,
    realAwsAccountNumber,
    roleArn,
  );
  if (!account) {
    throw new AppError("Failed to activate AWS account.", 500);
  }

  const updatedTeam = await teamModel.updateTeamStatus(teamId, "active");
  if (!updatedTeam) {
    // Activation succeeded but team status update failed; surface explicitly.
    throw new AppError(
      "AWS account activated but failed to update workspace status.",
      500,
    );
  }

  // 3. THE AUTOMATION: Trigger CUR Setup asynchronously (Don't await it!)
  curSetupService
    .automateCURSetup(account)
    .then(() => {
      console.log("CUR automation completed.");
    })
    .catch(async (err) => {
      // Defensive: never crash the server from async automation failures.
      try {
        if (account?.id) {
          await awsModel.updateCurStatus(account.id, "failed");
        }
      } catch (_e) {
        // ignore
      }
    });

  return true;
};

export const retryCurSetup = async (account) => {
  try {
    await curSetupService.automateCURSetup(account);
    await awsModel.updateCurStatus(account.id, "pending");
    return { success: true, message: "CUR Setup successfully initialized." };
  } catch (error) {
    await awsModel.updateCurStatus(account.id, "failed");
    throw new AppError(`Retry failed: ${error.message}`, 500);
  }
};

export const getAwsAccount = async (teamId) => {
  const account = await awsModel.getAwsAccountByTeamId(teamId);

  if (!account) throw new AppError("No AWS account found for this team", 404);

  const { iam_role_arn, external_id, ...safeAccount } = account;
  return safeAccount;
};

export const deactivateAwsAccount = async (internalAccountId) => {
  const result = await awsModel.deactivateAwsAccount(internalAccountId);
  return result;
};

export const ceGetCostAndUsage = async (
  account,
  startDate = dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  const MOCK_ACCOUNTS = ["111122223333", "444455556666", "777788889999"];
  if (MOCK_ACCOUNTS.includes(account.aws_account_id)) {
    const rows = await awsModel.getCachedCostData(
      account.id,
      startDate,
      endDate,
    );
    return { rowsAdded: 0, data: rows ?? [] };
  }

  const result = await costExplorerService.getCostAndUsage(
    account,
    startDate,
    endDate,
  );

  let rowsAdded = 0;
  await Promise.all(
    result.map(async (row) => {
      const data = {
        awsAccountId: account.id, // Using the internal DB UUID
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
  internalAccountId,
  startDate = dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  endDate = dayjs().format("YYYY-MM-DD"),
) => {
  const rows = await awsModel.getCachedCostData(
    internalAccountId,
    startDate,
    endDate,
  );

  if (rows === null) {
    throw new AppError("Failed to retrieve cached cost data", 500);
  }

  return rows;
};

export const syncCurData = async (account, options = {}) => {
  const { force = false } = options;
  const MOCK_ACCOUNTS = ["111122223333", "444455556666", "777788889999"];

  if (MOCK_ACCOUNTS.includes(account.aws_account_id)) {
    return {
      status: "mock_success",
      message:
        "Mock account detected: Skipping AWS CUR fetch. Granular testing data is already synchronized in the database.",
    };
  }

  const lastSync = await awsModel.getLastCurSyncTime(account.id);
  if (!force && lastSync) {
    const hoursSinceLastSync = dayjs().diff(dayjs(lastSync), "hour");
    if (hoursSinceLastSync < 12) {
      return {
        status: "already_synced",
        message: "The latest CUR report is already stored in the database.",
      };
    }
  }

  const result = await curService.fetchAndSyncCUR(account);

  const curRows = result.data?.length ?? 0;
  if (curRows > 0) {
    const rowsInserted = await awsModel.batchInsertCurData(
      account.id,
      result.data,
    );
    result.message = `Successfully synced and saved ${rowsInserted} records to the database.`;
    logger.info("CUR sync: rows persisted to cost_data", {
      component: "cur_sync",
      internalAccountId: account.id,
      awsAccountNumber: account.aws_account_id,
      rowsFromAthena: curRows,
      rowsInserted,
    });
  } else {
    logger.warn("CUR sync: Athena returned no rows — cost_data unchanged; ML needs daily_cost_summaries from CUR", {
      component: "cur_sync",
      internalAccountId: account.id,
      awsAccountNumber: account.aws_account_id,
    });
  }

  delete result.data;

  return result;
};

export const checkCurStatus = async (account) => {
  const MOCK_ACCOUNTS = ["111122223333", "444455556666", "777788889999"];
  if (MOCK_ACCOUNTS.includes(account.aws_account_id)) {
    await awsModel.updateCurStatus(account.id, "active");
    return { status: "active", message: "Mock account ready." };
  }

  const isReady = await curService.checkCurReadiness(account);

  if (isReady) {
    await awsModel.updateCurStatus(account.id, "active");
    return { status: "active", message: "CUR data is ready!" };
  }

  return { status: "pending", message: "Still waiting for AWS..." };
};
