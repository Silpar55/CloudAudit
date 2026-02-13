/**
 * AWS IAM Policy Generator
 *
 * Purpose: Generate IAM policies and trust policies for customer accounts
 * Responsibilities:
 * - Generate trust policies (who can assume the role)
 * - Generate permission policies (what the role can do)
 * - Return formatted JSON strings for UI display
 */

export const generateScripts = (pendingAccount) => {
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

  const permissionsPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "sts:GetCallerIdentity",

          "ec2:DescribeInstances",
          "s3:ListAllMyBuckets",
          "ce:GetCostAndUsage",
        ],
        Resource: "*",
      },
    ],
  };

  return {
    trustPolicyJson: JSON.stringify(trustPolicy, null, 2),
    permissionsPolicyJson: JSON.stringify(permissionsPolicy, null, 2),

    instructions: {
      step1: "Go to the IAM Console > Roles > select your role.",
      step2:
        "Click 'Trust relationships' > 'Edit trust policy' and paste the Trust Policy JSON.",
      step3:
        "Click 'Permissions' > 'Add permissions' > 'Create inline policy' and paste the Permissions Policy JSON.",
      externalId: pendingAccount.externalId,
    },
  };
};

export const generateReadOnlyAuditPolicy = () => {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ec2:Describe*",
          "s3:List*",
          "s3:Get*",
          "ce:Get*",
          "iam:Get*",
          "iam:List*",
        ],
        Resource: "*",
      },
    ],
  };
};

export const generateCostExplorerPolicy = () => {
  return {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "ce:GetDimensionValues",
          "ce:GetReservationUtilization",
          "ce:GetSavingsPlansUtilization",
        ],
        Resource: "*",
      },
    ],
  };
};
