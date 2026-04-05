/**
 * CloudAudit — Domain service: `aws`.
 * Business rules and orchestration; callers are controllers, jobs, or other services.
 */

import { createAthenaClient } from "#utils/aws/client-factory.js";
import { getTemporaryCredentials } from "#utils/aws/sts.js";
import {
  startQuery,
  getQueryStatus,
  getQueryExecutionSummary,
  getAllQueryResultRows,
} from "#utils/aws/athena.js";
import { AppError } from "#utils/helper/AppError.js";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { logger } from "#utils/logger.js";

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

const parseSingleCountCell = (rows) => {
  if (!rows || rows.length < 2) return null;
  const cell = rows[1]?.Data?.[0]?.VarCharValue;
  if (cell == null || cell === "") return null;
  const n = Number(cell);
  return Number.isFinite(n) ? n : null;
};

/**
 * AWS CUR line items are often not plain "Usage" (e.g. DiscountedUsage, SavingsPlanCoveredUsage).
 * CUR files also commonly lag — current calendar month in UTC can be empty while prior days have data.
 * Override types: CLOUDAUDIT_CUR_LINE_ITEM_TYPES=Usage,DiscountedUsage
 * Override lookback: CLOUDAUDIT_CUR_LOOKBACK_DAYS=90 (1–366)
 */
const getCurExtractFilter = () => {
  const rawDays = parseInt(process.env.CLOUDAUDIT_CUR_LOOKBACK_DAYS || "90", 10);
  const lookbackDays = Number.isFinite(rawDays)
    ? Math.min(Math.max(rawDays, 1), 366)
    : 90;

  const typesFromEnv = process.env.CLOUDAUDIT_CUR_LINE_ITEM_TYPES;
  const lineItemTypes = typesFromEnv
    ? typesFromEnv
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : ["Usage", "DiscountedUsage", "SavingsPlanCoveredUsage"];

  const escapedTypes = lineItemTypes.map((t) => `'${String(t).replace(/'/g, "''")}'`);
  const typeInClause = escapedTypes.join(", ");

  const datePredicate = `line_item_usage_start_date >= date_add('day', -${lookbackDays}, current_date)`;
  const typePredicate = `line_item_line_item_type IN (${typeInClause})`;
  const whereSql = `${datePredicate}\n      AND ${typePredicate}`;

  return {
    whereSql,
    lookbackDays,
    lineItemTypes,
  };
};

const getCurRowLimit = () => {
  const raw = parseInt(process.env.CLOUDAUDIT_CUR_ATHENA_ROW_LIMIT || "50000", 10);
  if (!Number.isFinite(raw)) return 50000;
  return Math.min(Math.max(raw, 100), 500000);
};

// ─── Core Service: Automate DDL & Extract Data ──────────────────────────────
export const fetchAndSyncCUR = async (account) => {
  const awsAccountNumber = account.aws_account_id;
  const internalAccountId = account.id;

  const logCtx = {
    component: "cur_athena",
    awsAccountNumber,
    internalAccountId: internalAccountId || null,
  };

  try {
    const credentials = await getTemporaryCredentials(account);
    const athenaClient = createAthenaClient("us-east-1", credentials);

    // Dynamic defaults unique to this specific user's account
    const athenaDatabase = "cloudaudit_cur";
    const athenaTable = "daily_report";
    const bucketName = `cloudaudit-cur-data-${awsAccountNumber}`;
    const s3OutputLocation = `s3://aws-athena-query-results-${awsAccountNumber}-us-east-1/`;

    // AWS automatically nests the Parquet files based on Prefix and Report Name
    const dataLocation = `s3://${bucketName}/cur/CloudAudit_Daily_Report/CloudAudit_Daily_Report/`;

    logger.info("CUR Athena: preparing database and external table", {
      ...logCtx,
      athenaDatabase,
      athenaTable,
      dataLocation,
      s3OutputLocation,
    });

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

    const { whereSql, lookbackDays, lineItemTypes } = getCurExtractFilter();
    const rowLimit = getCurRowLimit();

    // 3. Extract the Granular Data
    const selectQuery = `
      SELECT 
        line_item_resource_id, line_item_product_code, line_item_usage_type, 
        line_item_operation, line_item_usage_amount, line_item_unblended_cost,
        product_region, line_item_usage_start_date, line_item_blended_cost
      FROM ${athenaDatabase}.${athenaTable}
      WHERE ${whereSql}
      LIMIT ${rowLimit};
    `;

    logger.info("CUR Athena: running extraction SELECT", {
      ...logCtx,
      lookbackDays,
      lineItemTypes,
      rowLimit,
      filterNote:
        "Date window is rolling UTC days from CLOUDAUDIT_CUR_LOOKBACK_DAYS; types from CLOUDAUDIT_CUR_LINE_ITEM_TYPES or defaults include DiscountedUsage / SavingsPlanCoveredUsage.",
    });

    const selectExecutionId = await executeAthenaQuery(
      athenaClient,
      selectQuery,
      s3OutputLocation,
    );

    const execSummary = await getQueryExecutionSummary(
      athenaClient,
      selectExecutionId,
    );

    // 4. Retrieve and Parse Results (all pages — Athena paginates at ~1000 rows)
    const rows = await getAllQueryResultRows(athenaClient, selectExecutionId);
    const headerRow = rows[0];
    const dataRows = rows.slice(1); // Skip headers

    const headerLabels =
      headerRow?.Data?.map((c) => c.VarCharValue).filter(Boolean) ?? [];

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

    const sampleRowRaw =
      dataRows[0]?.Data?.map((c) => c.VarCharValue ?? "") ?? [];
    const sampleRowTruncated = sampleRowRaw.map((v) =>
      String(v).length > 120 ? `${String(v).slice(0, 120)}…` : String(v),
    );

    logger.info("CUR Athena: extraction finished", {
      ...logCtx,
      queryExecutionId: selectExecutionId,
      athenaStatistics: execSummary,
      resultRowCountRaw: rows.length,
      headerColumnCount: headerLabels.length,
      headerLabels,
      dataRowCount: dataRows.length,
      parsedRecordCount: parsedData.length,
      firstDataRowSample: sampleRowTruncated.length ? sampleRowTruncated : null,
    });

    if (parsedData.length === 0) {
      logger.warn("CUR Athena: zero rows after parse — ML daily_cost_summaries will stay empty until CUR returns data", {
        ...logCtx,
        queryExecutionId: selectExecutionId,
        lookbackDays,
        lineItemTypes,
        hints: [
          "If countAllTableRows > 0 but extraction is 0, widen CLOUDAUDIT_CUR_LOOKBACK_DAYS or set CLOUDAUDIT_CUR_LINE_ITEM_TYPES to match your CUR (see AWS CUR line_item_line_item_type).",
          "CREATE EXTERNAL TABLE IF NOT EXISTS does not fix a wrong LOCATION; drop the table in Athena if the path changed.",
        ],
        dataLocation,
      });

      const runDiagnostics =
        process.env.CLOUDAUDIT_CUR_ATHENA_DIAGNOSTICS === "1" ||
        process.env.CLOUDAUDIT_CUR_ATHENA_DIAGNOSTICS === "true";

      if (runDiagnostics) {
        try {
          const countAll = `SELECT COUNT(*) AS c FROM ${athenaDatabase}.${athenaTable}`;
          const countFiltered = `
            SELECT COUNT(*) AS c FROM ${athenaDatabase}.${athenaTable}
            WHERE ${whereSql}
          `;
          const idAll = await executeAthenaQuery(
            athenaClient,
            countAll,
            s3OutputLocation,
          );
          const rowsAll = await getAllQueryResultRows(athenaClient, idAll);
          const idFil = await executeAthenaQuery(
            athenaClient,
            countFiltered,
            s3OutputLocation,
          );
          const rowsFil = await getAllQueryResultRows(athenaClient, idFil);

          logger.warn("CUR Athena: diagnostic COUNT queries", {
            ...logCtx,
            countAllTableRows: parseSingleCountCell(rowsAll),
            countMatchingExtractFilter: parseSingleCountCell(rowsFil),
            lookbackDays,
            lineItemTypes,
          });
        } catch (diagErr) {
          logger.error("CUR Athena: diagnostic queries failed", {
            ...logCtx,
            error: diagErr?.message,
          });
        }
      } else {
        logger.info("CUR Athena: set CLOUDAUDIT_CUR_ATHENA_DIAGNOSTICS=true to run COUNT(*) diagnostics when rows are zero", {
          ...logCtx,
        });
      }
    }

    return {
      status: "real_sync_complete",
      message: `Successfully extracted ${parsedData.length} granular records from AWS Athena.`,
      data: parsedData,
    };
  } catch (error) {
    logger.error("CUR Athena: sync failed", {
      ...logCtx,
      error: error?.message,
      stack: error?.stack,
    });
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
