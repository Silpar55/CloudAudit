/**
 * CloudAudit — AWS integration helper: `cur`.
 * Uses AWS SDK v3; respects platform role assumption for customer accounts.
 */

import { PutReportDefinitionCommand } from "@aws-sdk/client-cost-and-usage-report-service";

export const putReportDefinition = async (client, definitionParams) => {
  await client.send(
    new PutReportDefinitionCommand({
      ReportDefinition: definitionParams,
    }),
  );
};
