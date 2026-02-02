import * as teamService from "./team.service.js";

export const createTeam = async (req, res, next) => {
  try {
    const teamId = await teamService.createTeam(req);

    return res
      .status(201)
      .send({ message: "Team created successfully", teamId });
  } catch (err) {
    next(err);
  }
};
export const deleteTeam = async (req, res, next) => {
  try {
    const teamId = await teamService.deleteTeam(req);
    return res
      .status(201)
      .send({ message: "Team deleted successfully", teamId });
  } catch (err) {
    next(err);
  }
};

export const addTeamMember = async (req, res, next) => {
  try {
    const teamMemberId = await teamService.addTeamMember(req);
    return res
      .status(201)
      .send({ message: "Member added into the team", teamMemberId });
  } catch (err) {
    next(err);
  }
};

export const deactivateTeamMember = async (req, res, next) => {
  try {
    const teamMemberId = await teamService.deactivateTeamMember(req);

    return res
      .status(201)
      .send({ message: "Member removed into the team", teamMemberId });
  } catch (err) {
    next(err);
  }
};

export const changeMemberRole = async (req, res, next) => {
  try {
    const { teamMemberId, prevRole, role } =
      await teamService.changeMemberRole(req);

    return res
      .status(201)
      .send({
        message: `Member change from ${prevRole} to ${role}`,
        teamMemberId,
      });
  } catch (err) {
    next(err);
  }
};
