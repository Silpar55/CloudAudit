import * as healthCheckService from "./health.service.js";

export const checkServerStatus = async (_req, res) => {
  const healthcheck = await healthCheckService.checkServerStatus();
  return res.status(200).json(healthcheck);
};

export const checkDatabaseStatus = async (_req, res) => {
  const healthcheck = await healthCheckService.checkDatabaseStatus();
  return res.status(200).json(healthcheck);
};

export const checkAuthStatus = async (req, res) => {
  const authHeader = req.headers.authorization;
  const healthcheck = await healthCheckService.checkAuthStatus(authHeader);
  return res.status(200).json(healthcheck);
};
