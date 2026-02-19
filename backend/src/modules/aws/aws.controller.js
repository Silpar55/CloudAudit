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

// export const listAwsAccounts = async (req, res, next) => {
//   try {
//     await awsService.listAwsAccounts();
//     return res.status(200).send({ message: "/accounts" });
//   } catch (err) {
//     next(err);
//   }
// };

export const ceGetCostAndUsage = async (req, res, next) => {
  try {
    const { teamId, accId } = req.params;

    const rowsAdded = await awsService.ceGetCostAndUsage(teamId, accId);

    return res.status(200).send({
      message: `AWS Cost Explorer: Cost and Usage Report \n Rows added in the database ${rowsAdded}`,
    });
  } catch (err) {
    next(err);
  }
};

export const deactivateAwsAccount = async (req, res, next) => {
  try {
    // 'accId' here refers to the internal UUID based on route /:accId
    const { teamId, accId } = req.params;

    const result = await awsService.deactivateAwsAccount(teamId, accId);

    return res.status(200).send({ message: "Account deactivated", result });
  } catch (err) {
    next(err);
  }
};
