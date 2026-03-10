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

export const getAwsAccount = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const account = await awsService.getAwsAccount(teamId);
    return res.status(200).send(account);
  } catch (err) {
    next(err);
  }
};

export const ceGetCostAndUsage = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // PERFORMANCE FIX: Pass the full pre-fetched account object to the service
    const { rowsAdded, data } = await awsService.ceGetCostAndUsage(
      req.awsAccount,
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

export const getCachedCostData = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // PERFORMANCE FIX: Pass just the internal ID to the service
    const rows = await awsService.getCachedCostData(
      req.awsAccount.id,
      startDate,
      endDate,
    );

    return res.status(200).send({ data: rows });
  } catch (err) {
    next(err);
  }
};

export const syncCurData = async (req, res, next) => {
  try {
    const result = await awsService.syncCurData(req.awsAccount);

    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const retryCurSetup = async (req, res, next) => {
  try {
    const result = await awsService.retryCurSetup(req.awsAccount);
    return res.status(200).send(result);
  } catch (err) {
    next(err);
  }
};

export const deactivateAwsAccount = async (req, res, next) => {
  try {
    // PERFORMANCE FIX: Pass just the internal ID to the service
    const result = await awsService.deactivateAwsAccount(req.awsAccount.id);
    return res.status(200).send({ message: "Account deactivated", result });
  } catch (err) {
    next(err);
  }
};
