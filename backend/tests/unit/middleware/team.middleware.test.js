/**
 * CloudAudit — Unit tests for `team.middleware`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// FIXED: Mocking the correct functions
jest.mock("#modules/team/team.model.js", () => ({
  getTeamMemberById: jest.fn(),
  getTeamById: jest.fn(),
}));

import { getTeamMemberById, getTeamById } from "#modules/team/team.model.js";
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
      getTeamMemberById.mockResolvedValue({ role: "admin" });

      await verifyPermissions(req, res, next);

      expect(getTeamMemberById).toHaveBeenCalledWith("team-123", "user-456");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("Should call next() if the user is an 'owner'", async () => {
      getTeamMemberById.mockResolvedValue({ role: "owner" });

      await verifyPermissions(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("Should return 401 if the user has a 'member' role", async () => {
      getTeamMemberById.mockResolvedValue({ role: "member" });

      await verifyPermissions(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You are not authorize to do this action",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("verifyTeamId", () => {
    it("Should call next() if the team exists", async () => {
      const mockTeam = {
        team_id: "team-123",
        name: "Engineering Team",
      };
      // FIXED: Uses getTeamById
      getTeamById.mockResolvedValue(mockTeam);

      await verifyTeamId(req, res, next);

      expect(getTeamById).toHaveBeenCalledWith("team-123");
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("Should return 404 if the team does not exist", async () => {
      getTeamById.mockResolvedValue(null);

      await verifyTeamId(req, res, next);

      expect(getTeamById).toHaveBeenCalledWith("team-123");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Team Id does not exists",
        }),
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
