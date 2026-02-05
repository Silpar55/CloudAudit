import app from "#app";
import { verifyAwsConnection } from "#utils";

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log("App listening on port", port);
  await verifyAwsConnection();
});
