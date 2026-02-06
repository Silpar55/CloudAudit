import * as teamModel from "#modules/team/team.model.js";

export async function verifyPermissions(req, res, next) {
  // Check if user is admin in the team
  const { role } = await teamModel.getTeamMember(req.params.teamId, req.userId);

  if (!["admin", "owner"].includes(role))
    return res.status(401).json({
      message: "You are not authorize to do this action",
    });

  next();
}

export async function verifyTeamId(req, res, next) {
  const { teamId } = req.params;

  const team = await teamModel.findTeam(teamId);

  if (!team)
    return res.status(404).json({
      message: "Team Id does not exists",
    });

  next();
}
