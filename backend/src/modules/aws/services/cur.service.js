import { createAthenaClient } from "#utils/aws/client-factory.js";
import { getTemporaryCredentials } from "#utils/aws/sts.js";
import {
  startQuery,
  getQueryStatus,
  getQueryResults,
} from "#utils/aws/athena.js";
import { AppError } from "#utils/helper/AppError.js";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Internal Helper: Run query and wait for completion ──────────────────────
const executeAthenaQuery = async (
  athenaClient,
  queryString,
  outputLocation,
) => {
  const executionId = await startQuery(
    athenaClient,
    queryString,
    outputLocation,
  );
  let status = "RUNNING";

  while (status === "RUNNING" || status === "QUEUED") {
    await sleep(2000);
    const queryStatusInfo = await getQueryStatus(athenaClient, executionId);
    status = queryStatusInfo.State;

    if (status === "FAILED" || status === "CANCELLED") {
      throw new Error(
        `Athena query failed: ${queryStatusInfo.StateChangeReason}`,
      );
    }
  }
  return executionId;
};

// ─── Core Service: Automate DDL & Extract Data ──────────────────────────────
export const fetchAndSyncCUR = async (account) => {
  try {
    const credentials = await getTemporaryCredentials(account);
    const athenaClient = createAthenaClient("us-east-1", credentials);

    // Dynamic defaults unique to this specific user's account
    const athenaDatabase = "cloudaudit_cur";
    const athenaTable = "daily_report";
    const bucketName = `cloudaudit-cur-data-${account.aws_account_id}`;
    const s3OutputLocation = `s3://aws-athena-query-results-${account.aws_account_id}-us-east-1/`;

    // AWS automatically nests the Parquet files based on Prefix and Report Name
    const dataLocation = `s3://${bucketName}/cur/CloudAudit_Daily_Report/CloudAudit_Daily_Report/`;

    console.log(
      `[Athena] Preparing Database and Table for account ${account.aws_account_id}...`,
    );

    // 1. Create the Database (If it doesn't exist)
    const createDbQuery = `CREATE DATABASE IF NOT EXISTS ${athenaDatabase};`;
    await executeAthenaQuery(athenaClient, createDbQuery, s3OutputLocation);

    // 2. Create the External Table mapped to the Parquet files
    // Parquet carries its own schema, so we only need to define the columns we actually want to select!
    const createTableQuery = `
      CREATE EXTERNAL TABLE IF NOT EXISTS ${athenaDatabase}.${athenaTable} (
        line_item_resource_id STRING,
        line_item_product_code STRING,
        line_item_usage_type STRING,
        line_item_operation STRING,
        line_item_usage_amount DOUBLE,
        line_item_unblended_cost DOUBLE,
        line_item_blended_cost DOUBLE,
        product_region STRING,
        line_item_usage_start_date TIMESTAMP,
        line_item_line_item_type STRING
      )
      STORED AS PARQUET
      LOCATION '${dataLocation}'
      tblproperties ("parquet.compress"="SNAPPY");
    `;
    await executeAthenaQuery(athenaClient, createTableQuery, s3OutputLocation);

    console.log(`[Athena] Executing Data Extraction Query...`);

    // 3. Extract the Granular Data
    const selectQuery = `
      SELECT 
        line_item_resource_id, line_item_product_code, line_item_usage_type, 
        line_item_operation, line_item_usage_amount, line_item_unblended_cost,
        product_region, line_item_usage_start_date, line_item_blended_cost
      FROM ${athenaDatabase}.${athenaTable}
      WHERE line_item_usage_start_date >= date_trunc('month', current_date)
      AND line_item_line_item_type = 'Usage'
      LIMIT 1000;
    `;

    const selectExecutionId = await executeAthenaQuery(
      athenaClient,
      selectQuery,
      s3OutputLocation,
    );

    // 4. Retrieve and Parse Results
    const rows = await getQueryResults(athenaClient, selectExecutionId);
    const dataRows = rows.slice(1); // Skip headers

    const parsedData = dataRows.map((row) => {
      const getVal = (index) => row.Data[index]?.VarCharValue || null;

      const unblendedCost = Number(getVal(5) || 0);
      const blendedCost = Number(getVal(8) || unblendedCost);
      const startDateStr = getVal(7) || new Date().toISOString();

      const dateObj = new Date(startDateStr);
      const billPeriod = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1)
        .toISOString()
        .split("T")[0];

      return {
        resource_id: getVal(0) || "Unknown",
        product_code: getVal(1) || "Unknown",
        usage_type: getVal(2) || "Unknown",
        operation: getVal(3) || "Unknown",
        usage_amount: Number(getVal(4) || 0),
        unblended_cost: unblendedCost,
        region: getVal(6) || "Unknown",
        time_interval: startDateStr,
        blended_cost: blendedCost,
        amortized_cost: blendedCost,
        bill_period: billPeriod,
      };
    });

    console.log(`[Athena] Successfully parsed ${parsedData.length} records.`);

    return {
      status: "real_sync_complete",
      message: `Successfully extracted ${parsedData.length} granular records from AWS Athena.`,
      data: parsedData,
    };
  } catch (error) {
    console.error("CUR Sync Error:", error);
    throw new AppError(`Failed to sync CUR data: ${error.message}`, 500);
  }
};

// ─── S3 Readiness Checker ──────────────────────────────────────────────
export const checkCurReadiness = async (account) => {
  try {
    const credentials = await getTemporaryCredentials(account);
    const s3Client = new S3Client({ region: "us-east-1", credentials });
    const bucketName = `cloudaudit-cur-data-${account.aws_account_id}`;

    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "cur/",
      MaxKeys: 100,
    });

    const response = await s3Client.send(command);

    if (response.Contents && response.Contents.length > 0) {
      return response.Contents.some((obj) => obj.Key.endsWith(".parquet"));
    }

    return false;
  } catch (error) {
    return false;
  }
};
