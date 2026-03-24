import * as teamService from "./team.service.js";

export const listTeamMembers = async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const members = await teamService.listTeamMembers(teamId);
    return res.status(200).send({ members });
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

    return res.status(200).send({ message: "Team updated successfully", team });
  } catch (err) {
    next(err);
  }
};

export const deleteTeam = async (req, res, next) => {
  try {
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
    const teamMemberId = await teamService.addTeamMember(email, teamId);

    return res
      .status(201)
      .send({ message: "Member added into the team", teamMemberId });
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

    return res.status(200).send({
      message: `Member changed from ${prevRole} to ${role}`,
      teamMemberId,
    }); // Changed 201 to 200
  } catch (err) {
    next(err);
  }
};
