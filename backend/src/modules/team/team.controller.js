import * as teamService from "./team.service.js";

export const createTeam = async (req, res, next) => {
  try {
    await teamService.createTeam();
  } catch (err) {
    next(err);
  }
};
export const deleteTeam = async (req, res, next) => {
  try {
    await teamService.deleteTeam();
  } catch (err) {
    next(err);
  }
};
export const addTeamMember = async (req, res, next) => {
  try {
    await teamService.addTeamMember();
  } catch (err) {
    next(err);
  }
};
