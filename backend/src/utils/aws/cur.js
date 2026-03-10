import { PutReportDefinitionCommand } from "@aws-sdk/client-cost-and-usage-report-service";

export const putReportDefinition = async (client, definitionParams) => {
  await client.send(
    new PutReportDefinitionCommand({
      ReportDefinition: definitionParams,
    }),
  );
};
