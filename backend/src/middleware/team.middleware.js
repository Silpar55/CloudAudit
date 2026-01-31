import * as teamModel from "#modules/team/team.model.js";

export async function verifyPermissions(req, res, next) {
  // Check if user is admin in the team
  const { role } = await teamModel.getTeamMember(req.params.teamId, req.userId);

  if (!["admin", "owner"].includes(role))
    return res.status(401).json({
      message: "You are not authorize to delete this team",
    });

  next();
}
