/**
 * CloudAudit — AWS integration helper: `s3`.
 * Uses AWS SDK v3; respects platform role assumption for customer accounts.
 */

import {
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";

export const createBucket = async (client, bucketName) => {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucketName }));
  } catch (err) {
    if (
      err.name !== "BucketAlreadyOwnedByYou" &&
      err.name !== "BucketAlreadyExists"
    ) {
      throw err;
    }
  }
};

export const putBucketPolicy = async (client, bucketName, policy) => {
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: bucketName,
      Policy: JSON.stringify(policy),
    }),
  );
};
