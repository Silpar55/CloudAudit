import { AppError, validRoleARN, validateUserRole } from "#utils";
import { randomUUID } from "crypto";
import { addAwsAccount } from "./aws.model.js";

export const createAwsConnection = async ({ body, params }) => {
  const { roleArn } = body;
  const { teamId } = params;

  if (!validRoleARN(roleArn)) throw new AppError("Role ARN is invalid", 400);

  // Assume role for checking before store it into the DB
  const customer = {
    roleArn,
    externalId: randomUUID(),
    awsAccId: roleArn.split(":")[4],
    teamId,
  };

  const isValid = await validateUserRole(customer);

  if (!isValid) throw new AppError("Unexpected error", 500);

  await addAwsAccount(customer);
};

export const listAwsAccounts = async () => {
  console.log("Calling /accounts");
  return;
};

export const deleteAwsConnection = async () => {
  console.log("Calling /disconnect");
  return;
};
