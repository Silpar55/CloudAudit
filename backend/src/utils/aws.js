import { AppError } from "./AppError.js";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export const checkConnection = async () => {
  const client = new STSClient({ region: "us-east-1" });
  try {
    const command = new GetCallerIdentityCommand({});
    const response = await client.send(command);

    console.log("Success! I am connected as:");
    console.log("Account ID:", response.Account);
    console.log("ARN:", response.Arn);
  } catch (err) {
    console.error("Connection failed:");
    console.error(err.message);
    process.exit(1);
  }
};

export const validateUserRole = async (customer) => {
  const client = new STSClient({ region: "us-east-1" });
  try {
    const command = new AssumeRoleCommand({
      RoleArn: customer.roleArn,
      RoleSessionName: "CloudAuditValidation",
      DurationSeconds: 900,
      ExternalId: customer.externalId,
    });

    await client.send(command);

    return true;
  } catch (error) {
    if (error.name === "AccessDenied") {
      throw new AppError(
        "Permission denied. The user likely hasn't updated their Trust Policy.",
        401,
      );
    } else if (error.name === "ValidationError") {
      throw new AppError("Invalid ARN format", 401);
    } else {
      console.error(`Unexpected error: ${error.message}`);
    }
    return false;
  }
};

export const assumeCustomerRole = async (customer) => {
  const sts = new STSClient({
    region: "us-east-1",
  });

  const { Credentials } = await sts.send(
    new AssumeRoleCommand({
      RoleArn: customer.roleArn,
      RoleSessionName: `cust-${customer.awsAccId}-${Date.now()}`,
      ExternalId: customer.externalId,
      DurationSeconds: 3600,
    }),
  );

  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken,
  };
};
