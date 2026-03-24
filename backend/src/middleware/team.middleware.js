import * as teamModel from "#modules/team/team.model.js";

export async function verifyPermissions(req, res, next) {
  const teamMember = await teamModel.getTeamMemberById(
    req.params.teamId,
    req.userId,
  );

  // Check if member exists AND if they have the right role
  if (!teamMember || !["admin", "owner"].includes(teamMember.role))
    return res.status(401).json({
      message: "You are not authorize to do this action",
    });

  // PERFORMANCE FIX: Attach the member to the request so downstream functions don't need to fetch it again
  req.teamMember = teamMember;
  next();
}

export async function verifyTeamId(req, res, next) {
  const { teamId } = req.params;

  const team = await teamModel.getTeamById(teamId);

  if (!team)
    return res.status(404).json({
      message: "Team Id does not exists",
    });

  // PERFORMANCE FIX: Attach the team to the request
  req.team = team;
  next();
}

/** Caller must be an active member of the team (any role). */
export async function verifyTeamMembership(req, res, next) {
  const teamMember = await teamModel.getTeamMemberById(
    req.params.teamId,
    req.userId,
  );

  if (!teamMember || !teamMember.is_active) {
    return res.status(403).json({
      message: "You are not a member of this team",
    });
  }

  req.teamMember = teamMember;
  next();
}
