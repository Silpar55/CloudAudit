import {
  GetMetricStatisticsCommand,
  ListMetricsCommand,
} from "@aws-sdk/client-cloudwatch";
import { createCloudWatchClient } from "./client-factory.js";

const getMetricAverage = async (
  client,
  namespace,
  metricName,
  dimensions,
  days,
) => {
  const EndTime = new Date();
  const StartTime = new Date();
  StartTime.setDate(StartTime.getDate() - days);

  const command = new GetMetricStatisticsCommand({
    Namespace: namespace,
    MetricName: metricName,
    Dimensions: dimensions,
    StartTime,
    EndTime,
    Period: 86400, // Daily aggregation
    Statistics: ["Average", "Maximum"],
  });

  try {
    const response = await client.send(command);
    if (!response.Datapoints || response.Datapoints.length === 0) return null;

    const avg =
      response.Datapoints.reduce((acc, dp) => acc + dp.Average, 0) /
      response.Datapoints.length;
    const max = Math.max(...response.Datapoints.map((dp) => dp.Maximum));

    return { avg, max };
  } catch (error) {
    return null;
  }
};

export const getEC2CpuUtilization = async (
  accountCredentials,
  instanceId,
  days = 14,
) => {
  const client = createCloudWatchClient("us-east-1", accountCredentials);
  const dimensions = [{ Name: "InstanceId", Value: instanceId }];
  return await getMetricAverage(
    client,
    "AWS/EC2",
    "CPUUtilization",
    dimensions,
    days,
  );
};

export const getEC2NetworkIO = async (
  accountCredentials,
  instanceId,
  days = 14,
) => {
  const client = createCloudWatchClient("us-east-1", accountCredentials);
  const dimensions = [{ Name: "InstanceId", Value: instanceId }];

  const netIn = await getMetricAverage(
    client,
    "AWS/EC2",
    "NetworkIn",
    dimensions,
    days,
  );
  const netOut = await getMetricAverage(
    client,
    "AWS/EC2",
    "NetworkOut",
    dimensions,
    days,
  );

  if (!netIn || !netOut) return null;

  return {
    avgInBytes: netIn.avg,
    avgOutBytes: netOut.avg,
    maxInBytes: netIn.max,
    maxOutBytes: netOut.max,
  };
};

export const getRecentEC2CpuMax = async (
  accountCredentials,
  instanceId,
  hours = 2,
) => {
  const client = createCloudWatchClient("us-east-1", accountCredentials);
  const EndTime = new Date();
  const StartTime = new Date(EndTime.getTime() - hours * 60 * 60 * 1000);

  try {
    const command = new GetMetricStatisticsCommand({
      Namespace: "AWS/EC2",
      MetricName: "CPUUtilization",
      Dimensions: [{ Name: "InstanceId", Value: instanceId }],
      StartTime,
      EndTime,
      Period: 300, // 5-minute granularity for pre-flight
      Statistics: ["Maximum"],
    });

    const response = await client.send(command);
    if (!response.Datapoints || response.Datapoints.length === 0) return null;
    return Math.max(...response.Datapoints.map((dp) => dp.Maximum));
  } catch (error) {
    return null;
  }
};

export const getRDSCpuUtilization = async (
  accountCredentials,
  dbInstanceId,
  days = 14,
) => {
  const client = createCloudWatchClient("us-east-1", accountCredentials);
  const dimensions = [{ Name: "DBInstanceIdentifier", Value: dbInstanceId }];
  return await getMetricAverage(
    client,
    "AWS/RDS",
    "CPUUtilization",
    dimensions,
    days,
  );
};

export const getRDSDatabaseConnections = async (
  accountCredentials,
  dbInstanceId,
  days = 14,
) => {
  const client = createCloudWatchClient("us-east-1", accountCredentials);
  const dimensions = [{ Name: "DBInstanceIdentifier", Value: dbInstanceId }];
  return await getMetricAverage(
    client,
    "AWS/RDS",
    "DatabaseConnections",
    dimensions,
    days,
  );
};

export const isCloudWatchAvailable = async (accountCredentials) => {
  const client = createCloudWatchClient("us-east-1", accountCredentials);
  try {
    // A lightweight probe to check permissions/connectivity
    const command = new ListMetricsCommand({ Namespace: "AWS/EC2", Limit: 1 });
    await client.send(command);
    return true;
  } catch (error) {
    return false;
  }
};
