/**
 * AWS Cost Explorer Service
 *
 * Purpose: All Cost Explorer operations
 * Responsibilities:
 * - Get cost and usage data
 * - Get cost forecasts
 * - Get dimension values
 * - Format cost data for database storage
 */

import { GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";

import { AppError } from "#utils/helper/AppError.js";
import { getTemporaryCredentials } from "#utils/aws/sts.js";
import { createCostExplorerClient } from "#utils/aws/client-factory.js";

export const getCostAndUsage = async (account, startDate, endDate) => {
  try {
    // Get temporary credentials for this account (STS AssumeRole into customer role).
    // Important: STS failures (trust/externalId mismatch) must not be reported as Cost Explorer permission issues.
    let credentials;
    try {
      credentials = await getTemporaryCredentials(account);
    } catch (error) {
      handleStsAssumeRoleError(error);
    }

    // Create Cost Explorer client with assumed role credentials
    const ceClient = createCostExplorerClient("us-east-1", credentials);

    // Execute the Cost and Usage query
    const result = await ceClient.send(
      new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Granularity: "DAILY",
        Metrics: ["UnblendedCost", "UsageQuantity"],
        GroupBy: [
          { Type: "DIMENSION", Key: "SERVICE" },
          { Type: "DIMENSION", Key: "REGION" },
        ],
        Filter: {
          Dimensions: {
            Key: "LINKED_ACCOUNT",
            Values: [account.aws_account_id],
          },
        },
      }),
    );

    // Filter and format results
    return filterCostResults(result);
  } catch (error) {
    handleCostExplorerError(error);
  }
};

/**
 * Filter cost results to only include entries with cost > 0
 * @param {Object} result - Raw Cost Explorer API result
 * @returns {Array} - Filtered array of cost groups
 */
const filterCostResults = (result) => {
  const filteredResults = [];

  for (const timeResult of result.ResultsByTime) {
    if (!timeResult.Groups || timeResult.Groups.length === 0) continue;
    const periodStart = timeResult.TimePeriod.Start;
    const periodEnd = timeResult.TimePeriod.End;

    for (const group of timeResult.Groups) {
      const cost = parseFloat(group.Metrics.UnblendedCost.Amount);

      // Only include if cost > 0
      if (cost > 0) {
        filteredResults.push({
          ...group,
          timePeriodStart: periodStart,
          timePeriodEnd: periodEnd,
        });
      }
    }
  }

  return filteredResults;
};

/**
 * Format cost data for database insertion
 * @param {Array} costData - Cost data from getCostAndUsage
 * @param {string} accountId - AWS account ID
 * @param {string} teamId - Team ID
 * @returns {Array} - Array of objects ready for database insertion
 */
export const formatCostDataForDB = (costData, accountId, teamId) => {
  return costData.map((group) => {
    const [service, region] = group.Keys;
    const cost = parseFloat(group.Metrics.UnblendedCost.Amount);
    const usage = parseFloat(group.Metrics.UsageQuantity.Amount);

    return {
      aws_account_id: accountId,
      team_id: teamId,
      service_name: service,
      region: region,
      cost: cost,
      usage_quantity: usage,
      currency: group.Metrics.UnblendedCost.Unit,
      recorded_at: new Date(),
    };
  });
};

/**
 * Get cost forecast for the next month
 * @param {Object} account - Account object
 * @returns {Promise<Object>} - Forecast data
 */
export const getCostForecast = async (account) => {
  // TODO: Implement when needed
  throw new Error("Not implemented yet");
};

/**
 * Handle Cost Explorer specific errors
 * @param {Error} error - Error from AWS SDK
 * @throws {AppError} - Formatted application error
 */
const handleCostExplorerError = (error) => {
  // SDK may surface AccessDenied as "AccessDenied" (mocked/tests) or "AccessDeniedException" (AWS)
  if (error?.name === "AccessDenied" || error?.name === "AccessDeniedException") {
    console.error(`Cost Explorer access denied: ${error.message}`);
    throw new AppError(
      "Permission denied. The user likely hasn't granted Cost Explorer permissions.",
      403,
    );
  } else if (error.name === "ValidationError") {
    throw new AppError("Invalid Cost Explorer request format", 400);
  } else {
    console.error(`Cost Explorer error: ${error.message}`);
    throw new AppError("Failed to retrieve cost data", 500);
  }
};

const handleStsAssumeRoleError = (error) => {
  const msg = String(error?.message || "");
  const isAccessDenied =
    error?.name === "AccessDenied" ||
    error?.name === "AccessDeniedException" ||
    /not authorized|access denied|is not authorized/i.test(msg);

  if (isAccessDenied && (/AssumeRole/i.test(msg) || error?.$metadata?.httpStatusCode === 403)) {
    console.error(`STS AssumeRole access denied: ${msg}`);
    throw new AppError(
      "Permission denied. The user likely hasn't updated their Trust Policy (principal ARN or ExternalId mismatch).",
      403,
    );
  }

  throw error;
};
