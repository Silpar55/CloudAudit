import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/team/team.model.js", () => ({
  getTeamMember: jest.fn(),
}));

import { getTeamMember } from "#modules/team/team.model.js";
import { verifyPermissions } from "#middleware";

describe("verifyPermissions Middleware", () => {
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
        message: "You are not authorize to delete this team",
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
});
