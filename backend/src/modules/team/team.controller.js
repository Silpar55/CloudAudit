import * as teamService from "./team.service.js";

export const createTeam = async (req, res, next) => {
  try {
    const { name } = req.body;

    const teamId = await teamService.createTeam(name, req.userId);

    return res
      .status(201)
      .send({ message: "Team created successfully", teamId });
  } catch (err) {
    next(err);
  }
};
export const deleteTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const deletedTeamId = await teamService.deleteTeam(teamId);

    return res
      .status(201)
      .send({ message: "Team deleted successfully", deletedTeamId });
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
    const teamMemberId = await teamService.deactivateTeamMember(teamId, userId);

    return res
      .status(201)
      .send({ message: "Member removed into the team", teamMemberId });
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
    );

    return res.status(201).send({
      message: `Member change from ${prevRole} to ${role}`,
      teamMemberId,
    });
  } catch (err) {
    next(err);
  }
};
