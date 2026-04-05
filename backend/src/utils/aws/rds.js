/**
 * CloudAudit — AWS integration helper: `rds`.
 * Uses AWS SDK v3; respects platform role assumption for customer accounts.
 */

import {
  ModifyDBInstanceCommand,
  DescribeDBInstancesCommand,
} from "@aws-sdk/client-rds";
import { createRDSClient } from "./client-factory.js";

export const getRDSInstanceDetails = async (credentials, dbInstanceId) => {
  const client = createRDSClient("us-east-1", credentials);
  const response = await client.send(
    new DescribeDBInstancesCommand({ DBInstanceIdentifier: dbInstanceId }),
  );
  return response.DBInstances[0];
};

export const modifyRDSInstanceClass = async (
  credentials,
  dbInstanceId,
  targetClass,
) => {
  const client = createRDSClient("us-east-1", credentials);
  await client.send(
    new ModifyDBInstanceCommand({
      DBInstanceIdentifier: dbInstanceId,
      DBInstanceClass: targetClass,
      ApplyImmediately: false, // Safer default, applies at next maintenance window
    }),
  );
};
