import * as awsService from "./aws.service.js";

export const initializePendingAccount = async (req, res, next) => {
  try {
    const { roleArn } = req.body;
    const { teamId } = req.params;

    const script = await awsService.initializePendingAccount(teamId, roleArn);

    return res.status(200).send({ message: "AWS account connected", script });
  } catch (err) {
    next(err);
  }
};

export const activateAwsAccount = async (req, res, next) => {
  try {
    const { roleArn } = req.body;
    const { teamId } = req.params;

    await awsService.activateAwsAccount(teamId, roleArn);
    return res.status(200).send({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /teams/:teamId/aws-accounts
 * Returns the team's AWS account record (internal UUID, status, timestamps).
 * IAM role ARN and external ID are stripped in the service layer.
 */
export const getAwsAccount = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const account = await awsService.getAwsAccount(teamId);

    return res.status(200).send(account);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /teams/:teamId/aws-accounts/ce/cost-usage/:accId
 * Triggers a fresh Cost Explorer sync via the AWS API, upserts results into
 * cost_explorer_cache, then returns the full cached rows for the date window
 * so the frontend can render without a second round-trip.
 *
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * :accId is the internal aws_accounts.id UUID.
 */
export const ceGetCostAndUsage = async (req, res, next) => {
  try {
    const { teamId, accId } = req.params;
    const { startDate, endDate } = req.query;

    const { rowsAdded, data } = await awsService.ceGetCostAndUsage(
      teamId,
      accId,
      startDate,
      endDate,
    );

    return res.status(200).send({
      message: `Cost Explorer sync complete. Rows upserted: ${rowsAdded}`,
      rowsAdded,
      data,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /teams/:teamId/aws-accounts/ce/cost-usage/:accId/cached
 * Returns rows already in cost_explorer_cache — no AWS API call.
 * Used by the dashboard for normal page loads and date range changes.
 *
 * Query params: startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
 * :accId is the internal aws_accounts.id UUID.
 */
export const getCachedCostData = async (req, res, next) => {
  try {
    const { teamId, accId } = req.params;
    const { startDate, endDate } = req.query;

    const rows = await awsService.getCachedCostData(
      teamId,
      accId,
      startDate,
      endDate,
    );

    return res.status(200).send({ data: rows });
  } catch (err) {
    next(err);
  }
};

export const deactivateAwsAccount = async (req, res, next) => {
  try {
    const { teamId, accId } = req.params;

    const result = await awsService.deactivateAwsAccount(teamId, accId);

    return res.status(200).send({ message: "Account deactivated", result });
  } catch (err) {
    next(err);
  }
};
