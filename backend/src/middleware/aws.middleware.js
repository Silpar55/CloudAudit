import * as awsModel from "#modules/aws/aws.model.js";

export async function verifyAwsAccId(req, res, next) {
  const { teamId, accId } = req.params;

  const account = await awsModel.findAwsAccount(accId, teamId);

  if (!account)
    return res.status(404).json({
      message: "Account id does not exists",
    });

  next();
}
