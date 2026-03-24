import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/team/team.service.js");
import * as teamService from "#modules/team/team.service.js";
import {
  createTeam,
  getTeamsByUserId,
  getTeamById,
  updateTeam,
  deleteTeam,
  getTeamMemberById,
  addTeamMember,
  changeMemberRole,
  deactivateTeamMember,
} from "#modules/team/team.controller.js";

describe("Team Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      userId: "user-123",
      team: {},
      teamMember: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("getTeamsByUserId", () => {
    it("Should fetch teams and return 200", async () => {
      teamService.getTeamsByUserId.mockResolvedValue([{ team_id: "team-123" }]);
      await getTeamsByUserId(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        teams: [{ team_id: "team-123" }],
      });
    });

    it("Should handle errors and call next()", async () => {
      const error = new Error("DB Error");
      teamService.getTeamsByUserId.mockRejectedValue(error);
      await getTeamsByUserId(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getTeamById", () => {
    it("Should fetch a single team directly from req.team and return 200", async () => {
      req.params = { teamId: "team-123" };
      // Middleware now injects this, bypassing the service
      req.team = { team_id: "team-123", name: "Engineering" };

      await getTeamById(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        team: { team_id: "team-123", name: "Engineering" },
      });
    });
  });

  describe("createTeam", () => {
    it("Should create a team and return 201", async () => {
      req.body = { name: "Engineering", description: "Desc" };
      teamService.createTeam.mockResolvedValue("team-123");
      await createTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("updateTeam", () => {
    it("Should update a team and return 200", async () => {
      req.params = { teamId: "team-123" };
      req.body = { name: "New Name", description: "New Desc" };
      teamService.updateTeamDetails.mockResolvedValue({
        team_id: "team-123",
        name: "New Name",
      });
      await updateTeam(req, res, next);
      expect(teamService.updateTeamDetails).toHaveBeenCalledWith("team-123", {
        name: "New Name",
        description: "New Desc",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Team updated successfully" }),
      );
    });

    it("Should handle errors and call next()", async () => {
      const error = new Error("DB Error");
      teamService.updateTeamDetails.mockRejectedValue(error);
      await updateTeam(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("getTeamMemberById", () => {
    it("Should fetch team member and return 200", async () => {
      req.params = { teamId: "team-123" };
      teamService.getTeamMemberById.mockResolvedValue({ role: "admin" });
      await getTeamMemberById(req, res, next);
      expect(teamService.getTeamMemberById).toHaveBeenCalledWith(
        "team-123",
        "user-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("Should handle errors and call next()", async () => {
      const error = new Error("DB Error");
      teamService.getTeamMemberById.mockRejectedValue(error);
      await getTeamMemberById(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("addTeamMember", () => {
    it("Should add a member and return 201", async () => {
      req.body = { email: "test@user.com" };
      req.params = { teamId: "team-123" };
      teamService.addTeamMember.mockResolvedValue("tm-123");
      await addTeamMember(req, res, next);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe("deactivateTeamMember", () => {
    it("Should deactivate a member and return 200", async () => {
      req.params = { teamId: "team-123", userId: "user-456" };
      teamService.deactivateTeamMember.mockResolvedValue("tm-123");
      await deactivateTeamMember(req, res, next);
      expect(teamService.deactivateTeamMember).toHaveBeenCalledWith(
        "team-123",
        "user-456",
        "user-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("changeMemberRole", () => {
    it("Should change role and return 200", async () => {
      req.body = { newRole: "admin" };
      req.params = { teamId: "team-123", userId: "user-456" };
      teamService.changeMemberRole.mockResolvedValue({
        teamMemberId: "tm-123",
        prevRole: "member",
        role: "admin",
      });
      await changeMemberRole(req, res, next);
      expect(teamService.changeMemberRole).toHaveBeenCalledWith(
        "team-123",
        "user-456",
        "admin",
        "user-123",
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("deleteTeam", () => {
    it("Should delete team and return 200", async () => {
      req.params = { teamId: "team-123" };
      teamService.deleteTeam.mockResolvedValue("team-123");
      await deleteTeam(req, res, next);
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
