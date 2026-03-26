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

export const getTeamNotificationCounts = async (userId) => {
  return teamModel.getTeamNotificationCounts(userId);
};

// PERFORMANCE FIX: getTeamById was removed from the service
// because it is now handled directly by the middleware and controller.

export const getTeamMemberById = async (teamId, userId) => {
  const teamMember = await teamModel.getTeamMemberById(teamId, userId);
  return teamMember;
};

export const listTeamMembers = async (teamId) => {
  return teamModel.getActiveTeamMembersWithUsers(teamId);
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

export const deactivateTeamMember = async (teamId, targetUserId, actorUserId) => {
  const actor = await teamModel.getTeamMemberById(teamId, actorUserId);
  if (!actor?.is_active)
    throw new AppError("You are not a member of this team", 403);

  const member = await teamModel.getTeamMemberById(teamId, targetUserId);
  if (!member?.is_active) throw new AppError("User is not in the team", 404);

  if (actor.role === "admin") {
    if (actor.user_id === targetUserId) {
      throw new AppError("Admins cannot remove themselves from the team", 403);
    }
    if (member.role !== "member") {
      throw new AppError(
        "Only an owner can remove administrators or owners",
        403,
      );
    }
  }

  if (member.role === "owner") {
    if (actor.role !== "owner") {
      throw new AppError("Only an owner can remove another owner", 403);
    }
    const ownerCount = await teamModel.countActiveOwners(teamId);
    if (ownerCount <= 1) {
      throw new AppError("Cannot remove the only owner of the workspace", 400);
    }
  }

  const row = await teamModel.deactivateTeamMember(member.team_member_id);
  if (!row) throw new AppError("Failed to remove member", 500);

  return row.team_member_id;
};

export const changeMemberRole = async (teamId, userId, newRole, actorUserId) => {
  const normalized = String(newRole || "")
    .trim()
    .toLowerCase();

  if (!["member", "admin", "owner"].includes(normalized)) {
    throw new AppError("This role does not exist", 400);
  }

  const actor = await teamModel.getTeamMemberById(teamId, actorUserId);
  if (!actor?.is_active)
    throw new AppError("You are not a member of this team", 403);

  const member = await teamModel.getTeamMemberById(teamId, userId);
  if (!member?.is_active) throw new AppError("User is not in the team", 404);

  if (actor.role === "admin") {
    if (actor.user_id === userId) {
      throw new AppError("Admins cannot change their own role", 403);
    }
    if (member.role !== "member") {
      throw new AppError(
        "Admins can only change roles for regular members",
        403,
      );
    }
    if (normalized === "owner") {
      throw new AppError(
        "Only the workspace owner can assign the owner role",
        403,
      );
    }
  }

  if (normalized === "owner" && actor.role !== "owner") {
    throw new AppError(
      "Only the workspace owner can assign the owner role",
      403,
    );
  }

  if (member.role === "owner" && normalized !== "owner") {
    const ownerCount = await teamModel.countActiveOwners(teamId);
    if (ownerCount <= 1) {
      throw new AppError(
        "Cannot change role: team must have at least one owner",
        400,
      );
    }
    if (actor.role !== "owner") {
      throw new AppError(
        "Only an owner can change another owner's role",
        403,
      );
    }
  }

  const row = await teamModel.changeMemberRole(
    member.team_member_id,
    normalized,
  );
  if (!row) throw new AppError("Failed to update role", 500);

  return {
    team_member_id: row.team_member_id,
    prevRole: member.role,
    role: normalized,
  };
};
