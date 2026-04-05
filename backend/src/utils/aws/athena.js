/**
 * CloudAudit — AWS integration helper: `athena`.
 * Uses AWS SDK v3; respects platform role assumption for customer accounts.
 */

import {
  StartQueryExecutionCommand,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
} from "@aws-sdk/client-athena";

export const startQuery = async (client, queryString, outputLocation) => {
  const cmd = new StartQueryExecutionCommand({
    QueryString: queryString,
    ResultConfiguration: { OutputLocation: outputLocation },
  });
  const { QueryExecutionId } = await client.send(cmd);
  return QueryExecutionId;
};

export const getQueryStatus = async (client, executionId) => {
  const cmd = new GetQueryExecutionCommand({ QueryExecutionId: executionId });
  const res = await client.send(cmd);
  return res.QueryExecution.Status; // Returns { State, StateChangeReason, etc. }
};

/**
 * Metrics after a query finishes — useful when result rows are empty (scanned bytes, timing).
 */
export const getQueryExecutionSummary = async (client, executionId) => {
  const cmd = new GetQueryExecutionCommand({ QueryExecutionId: executionId });
  const res = await client.send(cmd);
  const qe = res.QueryExecution;
  const stats = qe?.Statistics || {};
  const ctx = qe?.QueryExecutionContext || {};
  return {
    state: qe?.Status?.State,
    stateChangeReason: qe?.Status?.StateChangeReason || null,
    dataScannedBytes: stats.DataScannedInBytes ?? null,
    totalExecutionTimeMs: stats.TotalExecutionTimeInMillis ?? null,
    queryQueueTimeMs: stats.QueryQueueTimeInMillis ?? null,
    engineExecutionTimeMs: stats.EngineExecutionTimeInMillis ?? null,
    serviceProcessingTimeMs: stats.ServiceProcessingTimeInMillis ?? null,
    outputLocation: qe?.ResultConfiguration?.OutputLocation || null,
    database: ctx?.Database || null,
    catalog: ctx?.Catalog || null,
  };
};

/**
 * Single page (max ~1000 rows). Prefer getAllQueryResultRows for SELECTs that may paginate.
 */
export const getQueryResults = async (client, executionId) => {
  const cmd = new GetQueryResultsCommand({ QueryExecutionId: executionId });
  const res = await client.send(cmd);
  return res.ResultSet.Rows;
};

/**
 * All pages of results. First page includes the header row; later pages are data-only (Athena API).
 */
export const getAllQueryResultRows = async (client, executionId) => {
  const rows = [];
  let nextToken;
  let isFirstPage = true;

  do {
    const cmd = new GetQueryResultsCommand({
      QueryExecutionId: executionId,
      NextToken: nextToken,
      MaxResults: 1000,
    });
    const res = await client.send(cmd);
    const batch = res.ResultSet?.Rows ?? [];

    if (isFirstPage) {
      rows.push(...batch);
      isFirstPage = false;
    } else {
      rows.push(...batch);
    }

    nextToken = res.NextToken;
  } while (nextToken);

  return rows;
};
