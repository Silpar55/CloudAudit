import * as teamModel from "./team.model.js";
import * as authModel from "#modules/auth/auth.model.js";

import { AppError } from "#utils/helper/AppError.js";
import { sendTeamInvitationEmail } from "#utils/aws/ses.js";
import { insertAuditLog } from "#modules/audit/audit.model.js";
import crypto from "crypto";

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
  const row = await teamModel.reactivateTeamMemberAsMember(teamMemberId);
  if (!row) throw new AppError("Failed to re-add member", 500);
  return row.team_member_id;
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

export const searchUsersToInvite = async (teamId, emailQuery) => {
  const q = String(emailQuery || "").trim().toLowerCase();
  if (!q) return [];
  if (q.length < 2) return [];

  return teamModel.searchInvitableUsersByEmail(teamId, q, 8);
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
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalizedEmail) throw new AppError("Email is required", 400);

  // Find user in the DB by email
  const user = await authModel.findUser(normalizedEmail);

  if (!user || user.is_active === false)
    throw new AppError("User does not exist", 404);

  // Check if user is already in the team
  const member = await teamModel.getTeamMemberById(teamId, user.user_id);

  // If was never being part of the team
  if (!member) return await addNewMember(teamId, user.user_id);

  // If it was part of the team in the past
  if (!member.is_active) return await reactivateMember(member.team_member_id);

  throw new AppError("User is already in the team", 400);
};

export const inviteTeamMember = async ({ teamId, email, actorUserId, teamName, actorName }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new AppError("Email is required", 400);

  const user = await authModel.findUser(normalizedEmail);
  if (!user || user.is_active === false)
    throw new AppError("User does not exist", 404);

  const existing = await teamModel.getTeamMemberById(teamId, user.user_id);
  if (existing?.is_active) throw new AppError("User is already in the team", 400);

  // Create a pending invitation (even if previously removed).
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await teamModel.createTeamInvitation({
    teamId,
    invitedUserId: user.user_id,
    invitedEmail: user.email,
    invitedBy: actorUserId,
    token,
    expiresAt,
  });
  if (!invitation) throw new AppError("Could not create invitation", 500);

  const auditLogId = await insertAuditLog(teamId, actorUserId, "TEAM_INVITE_CREATED", {
    invitationId: invitation.invitation_id,
    invitedUserId: user.user_id,
    invitedEmail: user.email,
  });

  try {
    await sendTeamInvitationEmail({
      toAddress: user.email,
      teamName,
      token,
      invitedByName: actorName,
    });
  } catch (_e) {
    // Invitation still exists; user can accept in-app. Surface email failure upstream.
    // Do not leak internals.
    throw new AppError(
      "Invitation created, but we couldn't send the email right now. The user can still accept from in-app notifications.",
      503,
    );
  }

  return {
    invitationId: invitation.invitation_id,
    auditLogId,
    invitedUserId: user.user_id,
    invitedEmail: user.email,
  };
};

const ensureMembershipActiveAsMember = async (teamId, userId) => {
  const member = await teamModel.getTeamMemberById(teamId, userId);
  if (!member) {
    await teamModel.addTeamMember(teamId, userId, TEAM_ROLES.MEMBER);
    return { alreadyMember: false };
  }
  if (!member.is_active) {
    await teamModel.reactivateTeamMemberAsMember(member.team_member_id);
    return { alreadyMember: false };
  }
  return { alreadyMember: true };
};

const getMembershipState = async (teamId, userId) => {
  const member = await teamModel.getTeamMemberById(teamId, userId);
  return {
    exists: Boolean(member),
    isActive: Boolean(member?.is_active),
    member,
  };
};

export const acceptInvitationByToken = async ({ token, actorUserId }) => {
  const t = String(token || "").trim();
  if (!t) throw new AppError("Invitation token is required", 400);

  const inv = await teamModel.getInvitationByToken(t);
  if (!inv) throw new AppError("Invitation is invalid or already used", 400);
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    throw new AppError("Invitation has expired", 400);
  if (String(inv.invited_user_id) !== String(actorUserId))
    throw new AppError("This invitation is not for your account", 403);

  if (inv.status === "declined" || inv.status === "cancelled" || inv.status === "expired") {
    throw new AppError("Invitation is invalid or already used", 400);
  }

  // If the invite was already accepted before, it must not be usable to re-join
  // after an owner removes the user. A new invitation must be created.
  if (inv.status === "accepted") {
    const state = await getMembershipState(inv.team_id, actorUserId);
    if (state.isActive) return { teamId: inv.team_id };
    throw new AppError(
      "This invitation has already been used. Please ask an owner/admin to send you a new invitation.",
      400,
    );
  }

  // Idempotent behavior:
  // - pending: mark accepted
  // - accepted: keep accepted and ensure membership active
  if (inv.status === "pending") {
    const accepted = await teamModel.markInvitationAccepted(inv.invitation_id);
    if (!accepted) {
      // Another request may have accepted it already; continue as idempotent
    }
  }

  const { alreadyMember } = await ensureMembershipActiveAsMember(
    inv.team_id,
    actorUserId,
  );

  if (!alreadyMember) {
    await insertAuditLog(inv.team_id, actorUserId, "TEAM_INVITE_ACCEPTED", {
      invitationId: inv.invitation_id,
    });
  }

  return { teamId: inv.team_id };
};

export const acceptInvitationById = async ({ invitationId, actorUserId }) => {
  const id = String(invitationId || "").trim();
  if (!id) throw new AppError("Invitation id is required", 400);

  const inv = await teamModel.getInvitationById(id);
  if (!inv) throw new AppError("Invitation is invalid or already used", 400);
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    throw new AppError("Invitation has expired", 400);
  if (String(inv.invited_user_id) !== String(actorUserId))
    throw new AppError("This invitation is not for your account", 403);

  if (inv.status === "declined" || inv.status === "cancelled" || inv.status === "expired") {
    throw new AppError("Invitation is invalid or already used", 400);
  }

  if (inv.status === "accepted") {
    const state = await getMembershipState(inv.team_id, actorUserId);
    if (state.isActive) return { teamId: inv.team_id };
    throw new AppError(
      "This invitation has already been used. Please ask an owner/admin to send you a new invitation.",
      400,
    );
  }

  if (inv.status === "pending") {
    const accepted = await teamModel.markInvitationAccepted(inv.invitation_id);
    if (!accepted) {
      // Another request may have accepted it already; continue as idempotent
    }
  }

  const { alreadyMember } = await ensureMembershipActiveAsMember(
    inv.team_id,
    actorUserId,
  );

  if (!alreadyMember) {
    await insertAuditLog(inv.team_id, actorUserId, "TEAM_INVITE_ACCEPTED", {
      invitationId: inv.invitation_id,
    });
  }

  return { teamId: inv.team_id };
};

export const listMyPendingInvitations = async (actorUserId) => {
  return teamModel.listPendingInvitationsForUser(actorUserId, 25);
};

export const declineInvitation = async ({ invitationId, actorUserId }) => {
  const id = String(invitationId || "").trim();
  if (!id) throw new AppError("Invitation id is required", 400);

  const row = await teamModel.markInvitationDeclined(id, actorUserId);
  if (!row) throw new AppError("Invitation is invalid or already used", 400);

  await insertAuditLog(row.team_id, actorUserId, "TEAM_INVITE_DECLINED", {
    invitationId: row.invitation_id,
  });

  return { invitationId: row.invitation_id, teamId: row.team_id };
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

  // Cancel any still-pending invitations so they can't be used later.
  await teamModel.cancelPendingInvitationsForUserAndTeam(teamId, targetUserId);

  return row.team_member_id;
};

export const changeMemberRole = async (teamId, userId, newRole, actorUserId) => {
  const normalized = String(newRole || "")
    .trim()
    .toLowerCase();

  if (!["member", "admin", "owner"].includes(normalized)) {
    throw new AppError("This role does not exist", 400);
  }

  // Product rule: exactly one workspace owner (set on team creation). No promotions to owner.
  if (normalized === "owner") {
    throw new AppError("A workspace can only have one owner.", 400);
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
  }

  // With single-owner rule, never allow changing the owner row's role.
  if (member.role === "owner") {
    throw new AppError("The workspace owner role cannot be changed.", 400);
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
