import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import {
  createAthenaClient,
  createS3Client,
} from "#utils/aws/client-factory.js";
import { getTemporaryCredentials } from "#utils/aws/sts.js";
import {
  startQuery,
  getQueryStatus,
  getQueryResults,
} from "#utils/aws/athena.js";
import { AppError } from "#utils/helper/AppError.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchAndSyncCUR = async (account) => {
  try {
    const credentials = await getTemporaryCredentials(account);
    const athenaClient = createAthenaClient("us-east-1", credentials);

    const athenaDatabase =
      process.env.ATHENA_CUR_DATABASE || "athenacurcfn_cloudaudit";
    const athenaTable = process.env.ATHENA_CUR_TABLE || "cloudaudit_report";
    const s3OutputLocation =
      process.env.ATHENA_OUTPUT_LOCATION ||
      `s3://aws-athena-query-results-${account.aws_account_id}-us-east-1/`;

    const queryString = `
      SELECT 
        line_item_resource_id, line_item_product_code, line_item_usage_type, 
        line_item_operation, line_item_usage_amount, line_item_unblended_cost,
        product_region, line_item_usage_start_date
      FROM ${athenaDatabase}.${athenaTable}
      WHERE line_item_usage_start_date >= date_trunc('month', current_date)
      AND line_item_line_item_type = 'Usage'
      LIMIT 1000;
    `;

    // 1. Start Query using the util
    const executionId = await startQuery(
      athenaClient,
      queryString,
      s3OutputLocation,
    );

    // 2. Poll using the util
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

    // 3. Get results using the util
    const rows = await getQueryResults(athenaClient, executionId);
    const dataRows = rows.slice(1); // Skip headers

    return {
      status: "real_sync_complete",
      message: `Successfully synchronized ${dataRows.length} granular records from AWS Athena.`,
      recordsProcessed: dataRows.length,
    };
  } catch (error) {
    console.error("CUR Sync Error:", error);
    throw new AppError(`Failed to sync CUR data: ${error.message}`, 500);
  }
};

export const checkCurReadiness = async (account) => {
  try {
    const credentials = await getTemporaryCredentials(account);
    const s3Client = createS3Client("us-east-1", credentials);
    const bucketName = `cloudaudit-cur-data-${account.aws_account_id}`;

    // Look inside the "cur/" folder where we told AWS to dump the reports
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: "cur/",
      MaxKeys: 100,
    });

    const response = await s3Client.send(command);

    // If AWS has generated the report, there will be .parquet data files present
    if (response.Contents && response.Contents.length > 0) {
      const hasData = response.Contents.some((obj) =>
        obj.Key.endsWith(".parquet"),
      );
      return hasData;
    }

    return false;
  } catch (error) {
    console.log(error);
    // If the bucket is completely empty or hasn't been provisioned fully yet
    console.log(
      `[CUR Status] Account ${account.aws_account_id} not ready:`,
      error.name,
    );
    return false;
  }
};
