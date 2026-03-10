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

export const getQueryResults = async (client, executionId) => {
  const cmd = new GetQueryResultsCommand({ QueryExecutionId: executionId });
  const res = await client.send(cmd);
  return res.ResultSet.Rows;
};
