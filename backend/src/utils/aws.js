import { AppError } from "./helper/AppError.js";
import {
  createSTSClient,
  getCallerIdentity,
  assumeRole,
} from "./helper/aws-helper.js";

export const verifyAwsConnection = async () => {
  const client = createSTSClient();

  try {
    const response = await getCallerIdentity(client);

    console.log("Success! I am connected as:");
    console.log("Account ID:", response.Account);
    console.log("ARN:", response.Arn);
  } catch (err) {
    console.error("Connection failed:");
    console.error(err.message);
    // process.exit(1);
  }
};

export const validateUserRole = async (customer) => {
  const client = createSTSClient();
  try {
    console.log(customer);
    const params = {
      RoleArn: customer.iam_role_arn,
      RoleSessionName: "CloudAuditValidation",
      DurationSeconds: 900,
      ExternalId: customer.external_id,
    };

    await assumeRole(client, params);

    return true;
  } catch (error) {
    if (error.name === "AccessDenied") {
      console.error(`Unexpected error: ${error.message}`);
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
  const sts = createSTSClient();

  const params = {
    RoleArn: customer.roleArn,
    RoleSessionName: `cust-${customer.awsAccId}-${Date.now()}`,
    ExternalId: customer.externalId,
    DurationSeconds: 3600,
  };

  const { Credentials } = await assumeRole(sts, params);

  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretAccessKey,
    sessionToken: Credentials.SessionToken,
  };
};

export const generateScripts = (pendingAccount) => {
  // 1. The Trust Policy (The "Lock")
  // This ensures ONLY your backend can assume the role, and ONLY with the correct External ID.
  const trustPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          // IMPORTANT FOR TESTING: Put YOUR local ARN here (the SSO one we found earlier).
          // IN PRODUCTION: This would be "arn:aws:iam::YOUR_SAAS_ACCOUNT_ID:root"
          AWS: "arn:aws:iam::906063354856:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess_565401acba252927",
        },
        Action: "sts:AssumeRole",
        Condition: {
          StringEquals: {
            // This binds this specific Role to this specific Team/Integration
            "sts:ExternalId": pendingAccount.external_id,
          },
        },
      },
    ],
  };

  // 2. The Permissions Policy (The "Keys")
  // Minimal permissions just to test that the connection works.
  const permissionsPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          // Good for a simple connectivity test (returns the role's identity)
          "sts:GetCallerIdentity",
          // Common read-only permissions for an audit tool
          "ec2:DescribeInstances",
          "s3:ListAllMyBuckets",
        ],
        Resource: "*",
      },
    ],
  };

  return {
    // We return strings so they can be easily copied/displayed in the frontend
    trustPolicyJson: JSON.stringify(trustPolicy, null, 2),
    permissionsPolicyJson: JSON.stringify(permissionsPolicy, null, 2),

    // Helpful metadata for the UI
    instructions: {
      step1: "Go to the IAM Console > Roles > select your role.",
      step2:
        "Click 'Trust relationships' > 'Edit trust policy' and paste the Trust Policy JSON.",
      step3:
        "Click 'Permissions' > 'Add permissions' > 'Create inline policy' and paste the Permissions Policy JSON.",
      externalId: pendingAccount.externalId, // Display this clearly to the user!
    },
  };
};
