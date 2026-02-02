import * as teamModel from "./team.model.js";
import * as authModel from "#modules/auth/auth.model.js";

import { AppError } from "#utils";

const TEAM_ROLES = {
  MEMBER: "member",
  OWNER: "owner",
  ADMIN: "admin",
};

// Local functions
const addNewMember = async (teamId, userId) => {
  const { team_member_id } = await teamModel.addTeamMember(
    teamId,
    userId,
    TEAM_ROLES.MEMBER,
  );
  return team_member_id;
};

const reactivateMember = async (teamMemberId) => {
  const { team_member_id } = await teamModel.activateTeamMember(teamMemberId);
  return team_member_id;
};

export const createTeam = async ({ body, userId }) => {
  const { name } = body;

  if (!name) throw new AppError("Please enter a name", 400);

  const { team_id } = await teamModel.createTeam(name);

  // Add this user into the team created
  await teamModel.addTeamMember(team_id, userId, TEAM_ROLES.OWNER);

  return team_id;
};

export const deleteTeam = async ({ params }) => {
  const { teamId } = params;

  const team = await teamModel.deleteTeam(teamId);

  if (!team) throw new AppError("Team does not exist", 404);

  return team.team_id;
};

export const addTeamMember = async ({ body, params }) => {
  const { email } = body;
  const { teamId } = params;

  // Find user in the DB by email
  const user = await authModel.findUser(email);

  if (!user) throw new AppError("User does not exist", 404);

  // Check if user is already in the team
  const member = await teamModel.getTeamMember(teamId, user.user_id);

  // If was never being part of the team
  if (!member) return await addNewMember(teamId, user.user_id);

  // If it was part of the team in the past
  if (!member.is_active) return await reactivateMember(member.team_member_id);

  throw new AppError("User is already in the team", 400);
};

export const deactivateTeamMember = async ({ body, params }) => {
  const { userId } = body;
  const { teamId } = params;

  // Check if user is in the team
  const member = await teamModel.getTeamMember(teamId, userId);

  if (!member) throw new AppError("User is not in the team", 404);

  const { team_member_id } = await teamModel.deactivateTeamMember(
    member.team_member_id,
  );

  return team_member_id;
};

export const changeMemberRole = async ({ body, params }) => {
  let { userId, newRole } = body;
  const { teamId } = params;
  newRole = newRole.toUpperCase();

  console.log(newRole);
  // Confirm is a valid role
  if (!TEAM_ROLES[newRole]) throw new AppError("This role does not exist", 404);

  // Check if user is in the team
  const member = await teamModel.getTeamMember(teamId, userId);
  if (!member) throw new AppError("User is not in the team", 404);

  const { team_member_id } = await teamModel.changeMemberRole(
    member.team_member_id,
    newRole,
  );

  return {
    team_member_id,
    prevRole: member.role,
    role: newRole.toLowerCase(),
  };
};
