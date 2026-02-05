import * as awsService from "./aws.service.js";

export const createAwsConnection = async (req, res, next) => {
  try {
    await awsService.createAwsConnection(req);
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

export const deleteAwsConnection = async (req, res, next) => {
  try {
    await awsService.deleteAwsConnection();
    return res.status(200).send({ message: "/disconnect" });
  } catch (err) {
    next(err);
  }
};
