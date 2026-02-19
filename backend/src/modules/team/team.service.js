import * as teamModel from "./team.model.js";
import * as authModel from "#modules/auth/auth.model.js";

import { AppError } from "#utils/helper/AppError.js";

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

export const getTeamsByUserId = async (userId) => {
  const teams = await teamModel.getTeamsByUserId(userId);
  return teams;
};

export const getTeamById = async (teamId) => {
  const team = await teamModel.getTeamById(teamId);

  return team;
};

export const getTeamMemberById = async (teamId, userId) => {
  const teamMember = await teamModel.getTeamMemberById(teamId, userId);
  return teamMember;
};

export const createTeam = async (name, userId, description) => {
  if (!name) throw new AppError("Please enter a name", 400);

  const team = await teamModel.createTeam(name, description);

  if (!team) throw new AppError("Failed to create team", 500);

  await teamModel.addTeamMember(team.team_id, userId, TEAM_ROLES.OWNER);

  return team.team_id;
};

export const deleteTeam = async (teamId) => {
  const team = await teamModel.deleteTeam(teamId);

  if (!team) throw new AppError("Team does not exist", 404);

  return team.team_id;
};

export const updateTeamDetails = async (teamId, updateData) => {
  const team = await teamModel.updateTeam(teamId, updateData);
  if (!team) throw new AppError("Team not found or update failed", 404);
  return team;
};

export const addTeamMember = async (email, teamId) => {
  // Find user in the DB by email
  const user = await authModel.findUser(email);

  if (!user) throw new AppError("User does not exist", 404);

  // Check if user is already in the team
  const member = await teamModel.getTeamMemberById(teamId, user.user_id);

  // If was never being part of the team
  if (!member) return await addNewMember(teamId, user.user_id);

  // If it was part of the team in the past
  if (!member.is_active) return await reactivateMember(member.team_member_id);

  throw new AppError("User is already in the team", 400);
};

export const deactivateTeamMember = async (teamId, userId) => {
  // Check if user is in the team
  const member = await teamModel.getTeamMemberById(teamId, userId);

  if (!member) throw new AppError("User is not in the team", 404);

  const { team_member_id } = await teamModel.deactivateTeamMember(
    member.team_member_id,
  );

  return team_member_id;
};

export const changeMemberRole = async (teamId, userId, newRole) => {
  newRole = newRole.toUpperCase();

  // Confirm is a valid role
  if (!TEAM_ROLES[newRole]) throw new AppError("This role does not exist", 404);

  // Check if user is in the team
  const member = await teamModel.getTeamMemberById(teamId, userId);
  if (!member) throw new AppError("User is not in the team", 404);

  const { team_member_id } = await teamModel.changeMemberRole(
    member.team_member_id,
    TEAM_ROLES[newRole],
  );

  return {
    team_member_id,
    prevRole: member.role,
    role: newRole.toLowerCase(),
  };
};
