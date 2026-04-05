/**
 * CloudAudit — Domain service: `team`.
 * Business rules and orchestration; callers are controllers, jobs, or other services.
 */

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
    {
      notifyAnalysisEmail: false,
      analysisPrefsPrompted: false,
    },
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

  await teamModel.addTeamMember(team.team_id, userId, TEAM_ROLES.OWNER, {
    notifyAnalysisEmail: false,
    analysisPrefsPrompted: false,
  });

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

const buildInviteLink = (token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl}/invite/accept?token=${token}`;
};

/** Max SES invitation emails per pending row (resend if the first did not arrive). */
const MAX_INVITE_EMAILS = 2;

const RESERVED_INVITE_EMAIL_DOMAIN = "invite.link.cloudaudit";

/** Placeholder email for the one reusable global share row per team (not user-facing). */
const globalSharePlaceholderEmail = (teamId) =>
  `share+${teamId}@${RESERVED_INVITE_EMAIL_DOMAIN}`;

/**
 * Reusable workspace link: one pending row per team, not tied to an email.
 * Joiners follow the newcomer flow (sign up, verify, accept).
 */
export const getOrCreateGlobalShareInvite = async ({
  teamId,
  actorUserId,
  teamName: _teamName,
  actorName: _actorName,
}) => {
  const existing = await teamModel.findPendingGlobalInvitationByTeamId(teamId);
  if (existing) {
    return {
      invitationId: existing.invitation_id,
      inviteLink: buildInviteLink(existing.token),
      isNew: false,
      message:
        "Anyone with this link can sign up and join this workspace (newcomer flow: create an account, verify email, then join).",
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  const invitedEmail = globalSharePlaceholderEmail(teamId);

  const invitation = await teamModel.createTeamInvitation({
    teamId,
    invitedUserId: null,
    invitedEmail,
    invitedBy: actorUserId,
    token,
    expiresAt,
    isGlobalLink: true,
  });
  if (!invitation)
    throw new AppError("Could not create workspace share link", 500);

  await insertAuditLog(teamId, actorUserId, "TEAM_INVITE_CREATED", {
    invitationId: invitation.invitation_id,
    isGlobalLink: true,
    invitedEmail,
  });

  return {
    invitationId: invitation.invitation_id,
    inviteLink: buildInviteLink(token),
    isNew: true,
    message:
      "Workspace invite link created. Share it with newcomers — they create an account, verify email, then join.",
  };
};

export const previewInvitationByToken = async (rawToken) => {
  const token = String(rawToken || "").trim();
  if (!token) throw new AppError("Invitation token is required", 400);

  const inv = await teamModel.getInvitationByToken(token);
  if (!inv || inv.status !== "pending")
    throw new AppError("Invitation is invalid or has expired", 404);
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    throw new AppError("Invitation has expired", 400);

  const team = await teamModel.getTeamById(inv.team_id);
  if (!team) throw new AppError("Invitation is invalid or has expired", 404);

  return {
    teamName: team.name,
    invitedEmail: inv.is_global_link ? "" : inv.invited_email,
    expiresAt: inv.expires_at,
    isGlobalLink: Boolean(inv.is_global_link),
  };
};

export const inviteTeamMember = async ({
  teamId,
  email,
  actorUserId,
  teamName,
  actorName,
  sendEmail = true,
}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new AppError("Email is required", 400);

  if (normalizedEmail.endsWith(`@${RESERVED_INVITE_EMAIL_DOMAIN}`)) {
    throw new AppError(
      "This email address is reserved for workspace share links.",
      400,
    );
  }

  const user = await authModel.findUser(normalizedEmail);
  if (user && user.is_active === false)
    throw new AppError("This email belongs to a deactivated account", 400);

  if (user) {
    const existing = await teamModel.getTeamMemberById(teamId, user.user_id);
    if (existing?.is_active) throw new AppError("User is already in the team", 400);
  }

  const invitedUserId = user?.user_id ?? null;
  const invitedEmail = user?.email ?? normalizedEmail;

  const pending = await teamModel.findPendingInvitationByTeamAndEmail(
    teamId,
    normalizedEmail,
  );

  if (pending) {
    const inviteLink = buildInviteLink(pending.token);
    const sentCount = Math.min(
      Number(pending.invite_emails_sent) || 0,
      MAX_INVITE_EMAILS,
    );

    if (!sendEmail) {
      return {
        invitationId: pending.invitation_id,
        auditLogId: null,
        invitedUserId: pending.invited_user_id,
        invitedEmail: pending.invited_email,
        inviteLink,
        emailSent: false,
        inviteEmailsSent: sentCount,
        message:
          "Invitation link is ready. Copy it below — no email was sent. You can send up to two invitation emails from this screen if needed.",
      };
    }

    if (sentCount >= MAX_INVITE_EMAILS) {
      throw new AppError(
        "You have already sent the maximum of 2 invitation emails for this address. Share the invite link below, or wait until the invite expires and send a new one.",
        400,
        {
          meta: {
            inviteLink,
            invitationId: pending.invitation_id,
            inviteEmailsSent: sentCount,
          },
        },
      );
    }

    let emailSent = false;
    try {
      await sendTeamInvitationEmail({
        toAddress: invitedEmail,
        teamName,
        token: pending.token,
        invitedByName: actorName,
        isOpenInvite: !invitedUserId,
      });
      emailSent = true;
    } catch (_e) {
      emailSent = false;
    }

    const nextCount = emailSent ? sentCount + 1 : sentCount;
    await teamModel.setInvitationEmailsSent(pending.invitation_id, nextCount);

    const message = emailSent
      ? `Invitation email sent (${nextCount}/${MAX_INVITE_EMAILS}). They can also use the invite link below.`
      : invitedUserId
        ? "We couldn't send the email. Share the invite link or they can accept from in-app notifications."
        : "We couldn't send the email. Share the invite link so they can sign up or sign in.";

    return {
      invitationId: pending.invitation_id,
      auditLogId: null,
      invitedUserId: pending.invited_user_id,
      invitedEmail: pending.invited_email,
      inviteLink,
      emailSent,
      inviteEmailsSent: nextCount,
      message,
    };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const inviteLink = buildInviteLink(token);

  const invitation = await teamModel.createTeamInvitation({
    teamId,
    invitedUserId,
    invitedEmail,
    invitedBy: actorUserId,
    token,
    expiresAt,
  });
  if (!invitation) throw new AppError("Could not create invitation", 500);

  const auditLogId = await insertAuditLog(teamId, actorUserId, "TEAM_INVITE_CREATED", {
    invitationId: invitation.invitation_id,
    invitedUserId,
    invitedEmail,
  });

  let emailSent = false;
  let inviteEmailsSent = 0;

  if (sendEmail) {
    try {
      await sendTeamInvitationEmail({
        toAddress: invitedEmail,
        teamName,
        token,
        invitedByName: actorName,
        isOpenInvite: !invitedUserId,
      });
      emailSent = true;
      inviteEmailsSent = 1;
    } catch (_e) {
      emailSent = false;
    }
    await teamModel.setInvitationEmailsSent(invitation.invitation_id, inviteEmailsSent);
  }

  const message = !sendEmail
    ? "Invitation link is ready. Copy it below — no email was sent. You can send up to two invitation emails from this screen if needed."
    : emailSent
      ? invitedUserId
        ? "Invitation sent. The user must accept to join this workspace."
        : "Invitation email sent. They can also join using the invite link below."
      : invitedUserId
        ? "Invitation created, but we couldn't send the email. Share the invite link or they can accept from in-app notifications."
        : "Invitation created, but we couldn't send the email. Share the invite link so they can sign up or sign in.";

  return {
    invitationId: invitation.invitation_id,
    auditLogId,
    invitedUserId,
    invitedEmail,
    inviteLink,
    emailSent,
    inviteEmailsSent,
    message,
  };
};

const ensureMembershipActiveAsMember = async (
  teamId,
  userId,
  newMemberOptions = {
    notifyAnalysisEmail: true,
    analysisPrefsPrompted: true,
  },
) => {
  const member = await teamModel.getTeamMemberById(teamId, userId);
  if (!member) {
    await teamModel.addTeamMember(teamId, userId, TEAM_ROLES.MEMBER, newMemberOptions);
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

const assertInvitationMatchesActor = (inv, actorUser) => {
  if (!actorUser || actorUser.is_active === false) {
    throw new AppError("You must be signed in to accept this invitation", 401);
  }

  if (inv.invited_user_id != null) {
    if (String(inv.invited_user_id) !== String(actorUser.user_id)) {
      throw new AppError("This invitation is not for your account", 403);
    }
    return;
  }

  // Global share link: not email-bound; any verified account can join (newcomer UX path).
  if (inv.is_global_link) {
    if (!actorUser.email_verified) {
      throw new AppError(
        "Please verify your email before joining this workspace.",
        403,
      );
    }
    return;
  }

  const invEmail = String(inv.invited_email || "").trim().toLowerCase();
  const userEmail = String(actorUser.email || "").trim().toLowerCase();
  if (invEmail !== userEmail) {
    throw new AppError(
      "Sign in with the email address that received this invitation.",
      403,
    );
  }
  if (!actorUser.email_verified) {
    throw new AppError(
      "Please verify your email before joining this workspace.",
      403,
    );
  }
};

export const acceptInvitationByToken = async ({ token, actorUserId }) => {
  const t = String(token || "").trim();
  if (!t) throw new AppError("Invitation token is required", 400);

  const actorUser = await authModel.findUserById(actorUserId);
  const inv = await teamModel.getInvitationByToken(t);
  if (!inv) throw new AppError("Invitation is invalid or already used", 400);
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    throw new AppError("Invitation has expired", 400);
  assertInvitationMatchesActor(inv, actorUser);

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

  // Global share links stay pending so many people can use the same URL.
  if (inv.status === "pending" && !inv.is_global_link) {
    const accepted = await teamModel.markInvitationAccepted(inv.invitation_id);
    if (!accepted) {
      // Another request may have accepted it already; continue as idempotent
    }
  }

  const { alreadyMember } = await ensureMembershipActiveAsMember(
    inv.team_id,
    actorUserId,
    {
      notifyAnalysisEmail: false,
      analysisPrefsPrompted: false,
    },
  );

  if (!alreadyMember) {
    await insertAuditLog(inv.team_id, actorUserId, "TEAM_INVITE_ACCEPTED", {
      invitationId: inv.invitation_id,
      isGlobalLink: Boolean(inv.is_global_link),
    });
  }

  return { teamId: inv.team_id };
};

export const acceptInvitationById = async ({ invitationId, actorUserId }) => {
  const id = String(invitationId || "").trim();
  if (!id) throw new AppError("Invitation id is required", 400);

  const actorUser = await authModel.findUserById(actorUserId);
  const inv = await teamModel.getInvitationById(id);
  if (!inv) throw new AppError("Invitation is invalid or already used", 400);
  if (inv.expires_at && new Date(inv.expires_at) < new Date())
    throw new AppError("Invitation has expired", 400);
  assertInvitationMatchesActor(inv, actorUser);

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

  if (inv.status === "pending" && !inv.is_global_link) {
    const accepted = await teamModel.markInvitationAccepted(inv.invitation_id);
    if (!accepted) {
      // Another request may have accepted it already; continue as idempotent
    }
  }

  const { alreadyMember } = await ensureMembershipActiveAsMember(
    inv.team_id,
    actorUserId,
    {
      notifyAnalysisEmail: false,
      analysisPrefsPrompted: false,
    },
  );

  if (!alreadyMember) {
    await insertAuditLog(inv.team_id, actorUserId, "TEAM_INVITE_ACCEPTED", {
      invitationId: inv.invitation_id,
      isGlobalLink: Boolean(inv.is_global_link),
    });
  }

  return { teamId: inv.team_id };
};

export const updateMyNotificationPreferences = async (teamId, userId, prefs) => {
  const row = await teamModel.updateMemberAnalysisNotificationPrefs(
    teamId,
    userId,
    prefs,
  );
  if (!row) throw new AppError("Could not update notification preferences", 400);
  return row;
};

export const listMyPendingInvitations = async (actorUserId) => {
  const user = await authModel.findUserById(actorUserId);
  if (!user?.email) return [];
  return teamModel.listPendingInvitationsForUser(actorUserId, user.email, 25);
};

export const declineInvitation = async ({ invitationId, actorUserId }) => {
  const id = String(invitationId || "").trim();
  if (!id) throw new AppError("Invitation id is required", 400);

  const user = await authModel.findUserById(actorUserId);
  if (!user?.email) throw new AppError("Invitation is invalid or already used", 400);

  const row = await teamModel.markInvitationDeclined(id, actorUserId, user.email);
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

  const targetUser = await authModel.findUserById(targetUserId);
  const targetEmail = targetUser?.email || "";
  await teamModel.cancelPendingInvitationsForUserAndTeam(
    teamId,
    targetUserId,
    targetEmail,
  );

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
