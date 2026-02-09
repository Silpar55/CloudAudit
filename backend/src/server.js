import app from "#app";
import { verifyAwsConnection } from "#utils/aws.js";
import { verifyDatabaseConnection } from "#config";

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  await verifyDatabaseConnection();
  await verifyAwsConnection();
  console.log("App listening on port", port);
});
