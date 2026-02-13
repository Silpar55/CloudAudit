import app from "#app";
import { verifyAwsConnection } from "#utils/aws/sts.js";
import { verifyDatabaseConnection } from "#config";
import { startNightlyCostJob } from "./jobs/nightlyCost.job.js";

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  await verifyDatabaseConnection();
  await verifyAwsConnection();
  startNightlyCostJob();
  console.log("App listening on port", port);
});
