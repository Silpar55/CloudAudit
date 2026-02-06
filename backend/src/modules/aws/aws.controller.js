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

export const deactivateAwsAccount = async (req, res, next) => {
  try {
    const { teamId, accId } = req.params;

    const deactivatedAccId = await awsService.deactivateAwsAccount(
      teamId,
      accId,
    );

    return res
      .status(200)
      .send({ message: "Account deactivated", deactivatedAccId });
  } catch (err) {
    next(err);
  }
};
