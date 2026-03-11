/**
 * AWS IAM Policy Generator
 *
 * Purpose: Generate IAM policies and trust policies for customer accounts
 * Responsibilities:
 * - Generate trust policies (who can assume the role)
 * - Generate permission policies (what the role can do)
 * - Return formatted JSON strings for UI display and Bash script for CloudShell
 */
/**
 * AWS IAM Policy Generator
 */

export const generateScripts = (pendingAccount) => {
  const trustPolicy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          AWS: "arn:aws:iam::906063354856:role/aws-reserved/sso.amazonaws.com/AWSReservedSSO_AdministratorAccess_565401acba252927",
        },
        Action: "sts:AssumeRole",
        Condition: {
          StringEquals: {
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
        Sid: "CostExplorerAndBasicAccess",
        Effect: "Allow",
        Action: [
          "sts:GetCallerIdentity",
          "ec2:DescribeInstances",
          "s3:ListAllMyBuckets",
          "ce:GetCostAndUsage",
          "ce:GetDimensionValues",
          "ce:GetCostForecast",
          "ce:GetUsageForecast",
          "ce:GetTags",
        ],
        Resource: "*",
      },
      {
        Sid: "AthenaCURQueryAccess",
        Effect: "Allow",
        Action: [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:GetWorkGroup",
          "glue:GetDatabase",
          "glue:GetTable",
          "glue:GetPartitions",
          "glue:CreateDatabase",
          "glue:CreateTable",
          "glue:UpdateTable",
          "glue:DeleteTable",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject",
        ],
        Resource: "*",
      },
      {
        Sid: "CURAutomatedSetupAccess",
        Effect: "Allow",
        Action: [
          "s3:CreateBucket",
          "s3:PutBucketPolicy",
          "s3:GetBucketPolicy",
          "s3:GetBucketAcl",
          "cur:PutReportDefinition",
          "cur:DescribeReportDefinitions",
        ],
        Resource: [
          "arn:aws:s3:::cloudaudit-cur-data-*",
          "arn:aws:s3:::cloudaudit-cur-data-*/*",
          "*",
        ],
      },
    ],
  };

  const roleName = "CloudAuditRole";
  const policyName = "CloudAuditAccessPolicy";

  // Dynamically inject the exact JSON into the bash script
  const cloudShellScript = `#!/bin/bash
# ==============================================================================
# CloudAudit IAM Role Setup Script
# Run this in your AWS CloudShell to grant CloudAudit access to your billing data
# ==============================================================================

ROLE_NAME="${roleName}"
POLICY_NAME="${policyName}"

echo "Creating Trust Policy..."
cat << 'EOF' > trust-policy.json
${JSON.stringify(trustPolicy, null, 2)}
EOF

echo "Creating Access Policy..."
cat << 'EOF' > access-policy.json
${JSON.stringify(permissionsPolicy, null, 2)}
EOF

echo "Creating IAM Role ($ROLE_NAME)..."
aws iam create-role \\
  --role-name $ROLE_NAME \\
  --assume-role-policy-document file://trust-policy.json > /dev/null

echo "Creating IAM Policy ($POLICY_NAME)..."
POLICY_ARN=$(aws iam create-policy \\
  --policy-name $POLICY_NAME \\
  --policy-document file://access-policy.json \\
  --query 'Policy.Arn' \\
  --output text)

echo "Attaching Policy to Role..."
aws iam attach-role-policy \\
  --role-name $ROLE_NAME \\
  --policy-arn $POLICY_ARN

# Clean up
rm trust-policy.json access-policy.json

# Output the final ARN required for the CloudAudit dashboard
ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
echo ""
echo "✅ Success! Please copy the following ARN into your CloudAudit dashboard:"
echo "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
echo ""
`;

  return {
    trustPolicyJson: JSON.stringify(trustPolicy, null, 2),
    permissionsPolicyJson: JSON.stringify(permissionsPolicy, null, 2),
    cloudShellScript,

    instructions: {
      step1: "Go to the AWS IAM Console > Roles.",
      step2:
        "Click 'Create Role', select 'Custom trust policy', and paste the Trust Policy JSON.",
      step3:
        "Click 'Next', add a new inline policy, and paste the Permissions Policy JSON.",
      externalId: pendingAccount.external_id,
    },
    cloudShellInstructions: {
      step1:
        "Log into your AWS Console and click the 'CloudShell' icon (the terminal prompt symbol `>_` at the top right).",
      step2: "Wait a few seconds for the terminal environment to prepare.",
      step3:
        "Paste the entire script below into the terminal and press Enter. It will automatically output your new Role ARN!",
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
          "ce:GetDimensionValues",
          "ce:GetCostForecast",
          "ce:GetUsageForecast",
          "ce:GetTags",
        ],
        Resource: "*",
      },
    ],
  };
};
