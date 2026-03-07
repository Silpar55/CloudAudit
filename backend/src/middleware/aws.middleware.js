import * as awsModel from "#modules/aws/aws.model.js";

export async function verifyAwsAccId(req, res, next) {
  const { teamId, accId } = req.params;

  // 1. Look up using the internal UUID, not the 12-digit AWS ID
  const account = await awsModel.findAwsAccountById(accId);

  // 2. Verify it exists AND belongs to the requesting team
  if (!account || account.team_id !== teamId) {
    return res.status(404).json({
      message: "Account not found or access denied",
    });
  }

  // 3. PERFORMANCE FIX: Attach to request
  req.awsAccount = account;
  next();
}
