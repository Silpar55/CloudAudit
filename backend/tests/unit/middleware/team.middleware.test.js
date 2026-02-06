import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/team/team.model.js", () => ({
  getTeamMember: jest.fn(),
  findTeam: jest.fn(),
}));

import { getTeamMember, findTeam } from "#modules/team/team.model.js";
import { verifyPermissions, verifyTeamId } from "#middleware";

describe("Team Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: { teamId: "team-123" },
      userId: "user-456",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  describe("verifyPermissions", () => {
    it("Should call next() if the user is an 'admin'", async () => {
      getTeamMember.mockResolvedValue({ role: "admin" });

      await verifyPermissions(req, res, next);

      expect(getTeamMember).toHaveBeenCalledWith("team-123", "user-456");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("Should call next() if the user is an 'owner'", async () => {
      getTeamMember.mockResolvedValue({ role: "owner" });

      await verifyPermissions(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("Should return 401 if the user has a 'member' role", async () => {
      getTeamMember.mockResolvedValue({ role: "member" });

      await verifyPermissions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You are not authorize to do this action",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("Should return 401 if the user is not in the team (null result)", async () => {
      getTeamMember.mockResolvedValue({ role: undefined });

      await verifyPermissions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it("Should return 401 if role is null", async () => {
      getTeamMember.mockResolvedValue({ role: null });

      await verifyPermissions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("verifyTeamId", () => {
    it("Should call next() if the team exists", async () => {
      const mockTeam = {
        team_id: "team-123",
        name: "Engineering Team",
      };
      findTeam.mockResolvedValue(mockTeam);

      await verifyTeamId(req, res, next);

      expect(findTeam).toHaveBeenCalledWith("team-123");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("Should return 404 if the team does not exist", async () => {
      findTeam.mockResolvedValue(null);

      await verifyTeamId(req, res, next);

      expect(findTeam).toHaveBeenCalledWith("team-123");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Team Id does not exists",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });

    it("Should return 404 if findTeam returns undefined", async () => {
      findTeam.mockResolvedValue(undefined);

      await verifyTeamId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it("Should return 404 if findTeam returns falsy value", async () => {
      findTeam.mockResolvedValue(false);

      await verifyTeamId(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
