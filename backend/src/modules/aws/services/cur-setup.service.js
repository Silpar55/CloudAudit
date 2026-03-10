import { createS3Client, createCURClient } from "#utils/aws/client-factory.js";
import { getTemporaryCredentials } from "#utils/aws/sts.js";
import { createBucket, putBucketPolicy } from "#utils/aws/s3.js";
import { putReportDefinition } from "#utils/aws/cur.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const automateCURSetup = async (account) => {
  try {
    const credentials = await getTemporaryCredentials(account);
    const region = "us-east-1";
    const bucketName = `cloudaudit-cur-data-${account.aws_account_id}`;

    // Use factory
    const s3Client = createS3Client(region, credentials);
    const curClient = createCURClient(region, credentials);

    console.log(`[CUR Setup] Attempting to create S3 Bucket: ${bucketName}...`);
    await createBucket(s3Client, bucketName);

    console.log(`[CUR Setup] Attaching Bucket Policy for AWS Billing...`);
    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { Service: "billingreports.amazonaws.com" },
          Action: ["s3:GetBucketAcl", "s3:GetBucketPolicy"],
          Resource: `arn:aws:s3:::${bucketName}`,
          Condition: {
            StringEquals: {
              "aws:SourceAccount": account.aws_account_id,
              "aws:SourceArn": `arn:aws:cur:us-east-1:${account.aws_account_id}:definition/*`,
            },
          },
        },
        {
          Effect: "Allow",
          Principal: { Service: "billingreports.amazonaws.com" },
          Action: "s3:PutObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
          Condition: {
            StringEquals: {
              "aws:SourceAccount": account.aws_account_id,
              "aws:SourceArn": `arn:aws:cur:us-east-1:${account.aws_account_id}:definition/*`,
            },
          },
        },
      ],
    };
    await putBucketPolicy(s3Client, bucketName, bucketPolicy);

    console.log(`[CUR Setup] Waiting 5 seconds for IAM policy to propagate...`);
    await sleep(5000);

    console.log(`[CUR Setup] Configuring CUR Report Definition...`);
    await putReportDefinition(curClient, {
      ReportName: "CloudAudit_Daily_Report",
      TimeUnit: "DAILY",
      Format: "Parquet",
      Compression: "Parquet",
      AdditionalSchemaElements: ["RESOURCES"],
      S3Bucket: bucketName,
      S3Prefix: "cur",
      S3Region: region,
      AdditionalArtifacts: ["ATHENA"],
      RefreshClosedReports: true,
      ReportVersioning: "OVERWRITE_REPORT",
    });
  } catch (err) {
    // If the report was successfully created in a previous attempt, gracefully ignore the error
    if (
      err.name === "DuplicateReportNameException" ||
      err.__type === "DuplicateReportNameException"
    ) {
      console.log(
        `[CUR Setup] Report definition 'CloudAudit_Daily_Report' already exists. Proceeding...`,
      );
    } else {
      throw err;
    }
  }

  console.log(
    `[CUR Setup] Successfully initialized CUR for account ${account.aws_account_id}`,
  );
  return true;
};
