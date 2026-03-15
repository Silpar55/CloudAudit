import * as awsModel from "#modules/aws/aws.model.js";

export async function verifyAwsAccId(req, res, next) {
  const { teamId, internalAccountId } = req.params;

  // 1. Look up using the internal UUID, not the 12-digit AWS ID
  const account = await awsModel.findAwsAccountByInternalId(internalAccountId);

  // 2. Verify it exists AND belongs to the requesting team
  if (!account || account.team_id !== teamId) {
    return res.status(404).json({
      message: "Account not found or access denied",
    });
  }

  // 3. Attach to request
  req.awsAccount = account;
  next();
}
