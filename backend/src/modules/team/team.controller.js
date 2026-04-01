import * as teamService from "./team.service.js";
import { insertAuditLog } from "#modules/audit/audit.model.js";

export const previewTeamInvitation = async (req, res, next) => {
  try {
    const token = String(req.query.token ?? "").trim();
    const preview = await teamService.previewInvitationByToken(token);
    return res.status(200).send(preview);
  } catch (err) {
    next(err);
  }
};

export const listTeamMembers = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const members = await teamService.listTeamMembers(teamId);
    return res.status(200).send({ members });
  } catch (err) {
    next(err);
  }
};

export const searchUsersToInvite = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const q = String(req.query.email ?? "").trim();
    if (!q) return res.status(200).send({ users: [] });

    const users = await teamService.searchUsersToInvite(teamId, q);
    return res.status(200).send({ users });
  } catch (err) {
    next(err);
  }
};

export const getTeamsByUserId = async (req, res, next) => {
  try {
    const teams = await teamService.getTeamsByUserId(req.userId);
    return res.status(200).send({ teams }); // Changed 201 to 200 (Standard for GET)
  } catch (err) {
    next(err);
  }
};

export const getTeamNotificationCounts = async (req, res, next) => {
  try {
    const counts = await teamService.getTeamNotificationCounts(req.userId);
    const map = (counts ?? []).reduce((acc, row) => {
      acc[row.team_id] = row.unread_count;
      return acc;
    }, {});
    return res.status(200).send({ counts: map });
  } catch (err) {
    next(err);
  }
};

export const getTeamById = async (req, res, next) => {
  try {
    // PERFORMANCE FIX: req.team is populated by verifyTeamId middleware.
    // Zero redundant database calls!
    return res.status(200).send({ team: req.team });
  } catch (err) {
    next(err);
  }
};

export const createTeam = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const teamId = await teamService.createTeam(name, req.userId, description);

    return res
      .status(201)
      .send({ message: "Team created successfully", teamId });
  } catch (err) {
    next(err);
  }
};

export const updateTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { name, description } = req.body;

    const team = await teamService.updateTeamDetails(teamId, {
      name,
      description,
    });

    await insertAuditLog(teamId, req.userId, "TEAM_UPDATED", {
      name,
      description,
    });

    return res.status(200).send({ message: "Team updated successfully", team });
  } catch (err) {
    next(err);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
    if (req.teamMember?.role !== "owner") {
      return res.status(403).json({
        message: "Only a workspace owner can delete this workspace",
      });
    }

    const { teamId } = req.params;
    const deletedTeamId = await teamService.deleteTeam(teamId);

    return res
      .status(200)
      .send({ message: "Team deleted successfully", deletedTeamId }); // Changed 201 to 200
  } catch (err) {
    next(err);
  }
};

export const getTeamMemberById = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const teamMember = await teamService.getTeamMemberById(teamId, req.userId);

    return res.status(200).send({ teamMember }); // Changed 201 to 200
  } catch (err) {
    next(err);
  }
};

export const addTeamMember = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { teamId } = req.params;
    const workspaceName = req.team?.name;

    const result = await teamService.inviteTeamMember({
      teamId,
      email,
      actorUserId: req.userId,
      teamName: workspaceName ?? "your workspace",
      actorName: "",
    });

    return res.status(201).send({
      message: result.message,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export const acceptTeamInvitation = async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await teamService.acceptInvitationByToken({
      token,
      actorUserId: req.userId,
    });
    return res.status(200).send({ message: "Invitation accepted", ...result });
  } catch (err) {
    next(err);
  }
};

export const acceptTeamInvitationById = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const result = await teamService.acceptInvitationById({
      invitationId,
      actorUserId: req.userId,
    });
    return res.status(200).send({ message: "Invitation accepted", ...result });
  } catch (err) {
    next(err);
  }
};

export const listMyInvitations = async (req, res, next) => {
  try {
    const invites = await teamService.listMyPendingInvitations(req.userId);
    return res.status(200).send({ invitations: invites });
  } catch (err) {
    next(err);
  }
};

export const declineInvitation = async (req, res, next) => {
  try {
    const { invitationId } = req.params;
    const result = await teamService.declineInvitation({
      invitationId,
      actorUserId: req.userId,
    });
    return res.status(200).send({ message: "Invitation declined", ...result });
  } catch (err) {
    next(err);
  }
};

export const deactivateTeamMember = async (req, res, next) => {
  try {
    const { teamId, userId } = req.params;
    const teamMemberId = await teamService.deactivateTeamMember(
      teamId,
      userId,
      req.userId,
    );

    await insertAuditLog(teamId, req.userId, "TEAM_MEMBER_REMOVED", {
      targetUserId: userId,
      teamMemberId,
    });

    return res
      .status(200)
      .send({ message: "Member removed from the team", teamMemberId }); // Changed 201 to 200
  } catch (err) {
    next(err);
  }
};

export const changeMemberRole = async (req, res, next) => {
  try {
    const { newRole } = req.body;
    const { teamId, userId } = req.params;
    const { teamMemberId, prevRole, role } = await teamService.changeMemberRole(
      teamId,
      userId,
      newRole,
      req.userId,
    );

    await insertAuditLog(teamId, req.userId, "TEAM_MEMBER_ROLE_CHANGED", {
      targetUserId: userId,
      teamMemberId,
      prevRole,
      role,
    });

    return res.status(200).send({
      message: `Member changed from ${prevRole} to ${role}`,
      teamMemberId,
    }); // Changed 201 to 200
  } catch (err) {
    next(err);
  }
};
