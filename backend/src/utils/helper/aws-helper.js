import {
  STSClient,
  GetCallerIdentityCommand,
  AssumeRoleCommand,
} from "@aws-sdk/client-sts";

// Helper function to create STS client - easy to mock
export const createSTSClient = (region = "us-east-1") => {
  return new STSClient({ region });
};

// Helper function to call GetCallerIdentity - easy to mock
export const getCallerIdentity = async (client) => {
  const command = new GetCallerIdentityCommand({});
  return await client.send(command);
};

// Helper function to assume role - easy to mock
export const assumeRole = async (client, params) => {
  const command = new AssumeRoleCommand(params);

  return await client.send(command);
};
