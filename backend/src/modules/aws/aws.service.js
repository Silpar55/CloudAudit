import { AppError, validARN, validAWSAccId } from "#utils";

export const createAwsConnection = async ({ awsAccId, awsARN }) => {
  if (!validAWSAccId(awsAccId) || !validARN(awsARN))
    throw new AppError("Invalid credentials, please try again", 400);

  console.log("Calling aws.model.js");
};

export const listAwsAccounts = async () => {
  console.log("Calling /accounts");
  return;
};

export const deleteAwsConnection = async () => {
  console.log("Calling /disconnect");
  return;
};
