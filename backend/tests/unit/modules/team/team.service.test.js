import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/team/team.model.js");
jest.mock("#modules/auth/auth.model.js");

import * as teamService from "#modules/team/team.service.js";
import * as teamModel from "#modules/team/team.model.js";
import * as authModel from "#modules/auth/auth.model.js";
import { AppError } from "#utils/helper/AppError.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Team Service", () => {
  describe("createTeam", () => {
    it("Should throw AppError if name is missing", async () => {
      await expect(
        teamService.createTeam(null, "user-123", "desc"),
      ).rejects.toThrow(new AppError("Please enter a name", 400));
    });

    it("Should create team and add user as owner", async () => {
      teamModel.createTeam.mockResolvedValue({ team_id: "team-123" });
      teamModel.addTeamMember.mockResolvedValue({});

      const result = await teamService.createTeam(
        "Engineering",
        "user-123",
        "Description",
      );

      expect(teamModel.createTeam).toHaveBeenCalledWith(
        "Engineering",
        "Description",
      );
      expect(teamModel.addTeamMember).toHaveBeenCalledWith(
        "team-123",
        "user-123",
        "owner",
      );
      expect(result).toBe("team-123");
    });
  });

  describe("addTeamMember", () => {
    it("Should throw 404 AppError if user does not exist", async () => {
      authModel.findUser.mockResolvedValue(null);

      await expect(
        teamService.addTeamMember("fake@email.com", "team-123"),
      ).rejects.toThrow(new AppError("User does not exist", 404));
    });

    it("Should throw 400 AppError if user is already an active member", async () => {
      authModel.findUser.mockResolvedValue({ user_id: "user-123" });
      teamModel.getTeamMemberById.mockResolvedValue({ is_active: true });

      await expect(
        teamService.addTeamMember("exist@email.com", "team-123"),
      ).rejects.toThrow(new AppError("User is already in the team", 400));
    });

    it("Should reactivate an inactive member", async () => {
      authModel.findUser.mockResolvedValue({ user_id: "user-123" });
      teamModel.getTeamMemberById.mockResolvedValue({
        is_active: false,
        team_member_id: "tm-123",
      });
      teamModel.activateTeamMember.mockResolvedValue({
        team_member_id: "tm-123",
      });

      const result = await teamService.addTeamMember(
        "exist@email.com",
        "team-123",
      );

      expect(teamModel.activateTeamMember).toHaveBeenCalledWith("tm-123");
      expect(result).toBe("tm-123");
    });
  });

  describe("changeMemberRole", () => {
    it("Should throw 404 if role is invalid", async () => {
      await expect(
        teamService.changeMemberRole("team-123", "user-123", "SUPERADMIN"),
      ).rejects.toThrow(new AppError("This role does not exist", 404));
    });

    it("Should throw 404 if user is not in the team", async () => {
      teamModel.getTeamMemberById.mockResolvedValue(null);

      await expect(
        teamService.changeMemberRole("team-123", "user-123", "ADMIN"),
      ).rejects.toThrow(new AppError("User is not in the team", 404));
    });

    it("Should successfully change the role", async () => {
      teamModel.getTeamMemberById.mockResolvedValue({
        team_member_id: "tm-123",
        role: "member",
      });
      teamModel.changeMemberRole.mockResolvedValue({
        team_member_id: "tm-123",
      });

      const result = await teamService.changeMemberRole(
        "team-123",
        "user-123",
        "ADMIN",
      );

      expect(teamModel.changeMemberRole).toHaveBeenCalledWith(
        "tm-123",
        "admin",
      );
      expect(result.role).toBe("admin");
      expect(result.prevRole).toBe("member");
    });
  });
});
