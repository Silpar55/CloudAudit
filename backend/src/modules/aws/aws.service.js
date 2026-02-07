import { generateScripts, validateSTSConnection } from "#utils/aws.js";
import { validRoleARN } from "#utils/validation.js";

import { AppError } from "#utils/helper/AppError.js";

import { randomUUID } from "crypto";
import * as awsModel from "./aws.model.js";

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

export const activateAwsAccount = async (teamId, roleArn) => {
  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  const accId = roleArn.split(":")[4];

  const account = await awsModel.findAwsAccount(accId, teamId);

  if (!account) throw new AppError("Account not initialized", 404);

  const isValid = await validateSTSConnection(account);

  if (!isValid)
    throw new AppError("Validation Failed: Check Trust Policy", 400);

  await awsModel.activateAwsAccount(accId, teamId);
};

// export const listAwsAccounts = async () => {
//   console.log("Calling /accounts");
//   return;
// };

export const deactivateAwsAccount = async (teamId, accId) => {
  const { aws_account_id } = await awsModel.deactivateAwsAccount(accId, teamId);

  return aws_account_id;
};
