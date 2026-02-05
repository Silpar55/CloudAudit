import * as awsService from "./aws.service.js";

export const createAwsConnection = async (req, res, next) => {
  try {
    const { roleArn } = req.body;
    const { teamId } = req.params;

    await awsService.createAwsConnection(teamId, roleArn);
    return res.status(200).send({ message: "AWS account connected" });
  } catch (err) {
    next(err);
  }
};

export const listAwsAccounts = async (req, res, next) => {
  try {
    await awsService.listAwsAccounts();
    return res.status(200).send({ message: "/accounts" });
  } catch (err) {
    next(err);
  }
};

export const deactivateAwsConnection = async (req, res, next) => {
  try {
    await awsService.deactivateAwsConnection();
    return res.status(200).send({ message: "/disconnect" });
  } catch (err) {
    next(err);
  }
};
