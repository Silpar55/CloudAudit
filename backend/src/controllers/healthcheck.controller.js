import {
  healthCheckServer,
  healthCheckDatabase,
  healthCheckAuth,
} from "#services";

export async function serverCheck(_req, res) {
  const healthcheck = await healthCheckServer();
  return res.status(200).json(healthcheck);
}

export async function databaseCheck(_req, res) {
  const healthcheck = await healthCheckDatabase();
  return res.status(200).json(healthcheck);
}

export async function authCheck(req, res) {
  const authHeader = req.headers.authorization;
  const healthcheck = await healthCheckAuth(authHeader);
  return res.status(200).json(healthcheck);
}
