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
  // 1. Validate STS
  const pendingAccount = await awsModel.getAwsAccountByTeamId(teamId);

  if (!pendingAccount) throw new AppError("Account not found", 404);

  // Extract the real AWS Account ID from the final roleArn they pasted
  const realAwsAccountId = roleArn.split(":")[4];

  const isValid = await validateSTSConnection({
    iam_role_arn: roleArn,
    external_id: pendingAccount.external_id,
  });

  if (!isValid)
    throw new AppError(
      "STS connection failed. Verify role ARN and external ID.",
      400,
    );

  // 2. Activate the account in DB and set aws status as active in the team
  // Note: Since we are changing the workflow of how the user activate their AWS, we need to make sure we are storing real values
  const account = await awsModel.activateAwsAccount(
    pendingAccount.id,
    realAwsAccountId,
    roleArn,
  );
  await teamModel.updateTeamStatus(teamId, "active");

  // 3. THE AUTOMATION: Trigger CUR Setup asynchronously (Don't await it!)
  // This lets the API respond immediately to the frontend, while the bucket builds in the background.
  curSetupService
    .automateCURSetup(account)
    .then(() => {
      // We keep status as 'pending' because AWS takes 24hrs, but we know the bucket setup worked.
      console.log("CUR automation completed.");
    })
    .catch(async (err) => {
      // If setup failed (e.g. missing permissions), mark as failed so we can prompt them in UI
      await awsModel.updateCurStatus(account.id, "failed");
    });

  return true;
};

export const retryCurSetup = async (account) => {
  try {
    // Attempt to automate the setup again
    await curSetupService.automateCURSetup(account);

    // If successful, flip the status back to pending (waiting 24h for AWS)
    await awsModel.updateCurStatus(account.id, "pending");
    return { success: true, message: "CUR Setup successfully initialized." };
  } catch (error) {
    // Keep it as failed if it crashes again
    await awsModel.updateCurStatus(account.id, "failed");
    throw new AppError(`Retry failed: ${error.message}`, 500);
  }
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
  const result = await costExplorerService.getCostAndUsage(
    account,
    startDate,
    endDate,
  );

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

/**
 * Triggers the Cost and Usage Report (CUR) synchronization
 * Handles the logic between Mocked test accounts and Real AWS accounts
 */
export const syncCurData = async (account) => {
  // 1. The Interceptor: Check if this is a mocked account
  const MOCK_ACCOUNTS = ["111122223333", "444455556666", "777788889999"];

  if (MOCK_ACCOUNTS.includes(account.aws_account_id)) {
    // Return immediately. The database already has the granular data from 002_mock_data_injection.sql
    return {
      status: "mock_success",
      message:
        "Mock account detected: Skipping AWS CUR fetch. Granular testing data is already synchronized in the database.",
    };
  }

  // 2. If it is a real account, trigger the Athena extraction pipeline
  const result = await curService.fetchAndSyncCUR(account);
  return result;
};

export const checkCurStatus = async (account) => {
  // 1. Instantly approve mock accounts
  const MOCK_ACCOUNTS = ["111122223333", "444455556666", "777788889999"];
  if (MOCK_ACCOUNTS.includes(account.aws_account_id)) {
    await awsModel.updateCurStatus(account.id, "active");
    return { status: "active", message: "Mock account ready." };
  }

  // 2. Ping S3 for real accounts
  const isReady = await curService.checkCurReadiness(account);

  if (isReady) {
    // Data found! Instantly unlock the AI features in the database
    await awsModel.updateCurStatus(account.id, "active");
    return { status: "active", message: "CUR data is ready!" };
  }

  return { status: "pending", message: "Still waiting for AWS..." };
};
