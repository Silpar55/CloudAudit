import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the config before importing the functions that use it
jest.mock("#config");

import { pool } from "#config";
import {
  createTeam,
  deleteTeam,
  getTeamMember,
  addTeamMember,
  activateTeamMember,
  deactivateTeamMember,
} from "#modules/team/team.model.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Team model", () => {
  describe("createTeam", () => {
    it("Should insert a team and return the new team row", async () => {
      const teamName = "Engineering";
      const returnedRow = { team_id: "1", name: teamName };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await createTeam(teamName);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO teams"),
        [teamName],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if the query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB Error"));
      const result = await createTeam("Faulty Team");
      expect(result).toBeNull();
    });
  });

  describe("deleteTeam", () => {
    it("Should delete a team and return the deleted row", async () => {
      const teamId = "100";
      const returnedRow = { team_id: teamId, name: "Deleted Team" };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await deleteTeam(teamId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("DELETE FROM teams"),
        [teamId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if teamId does not exist or query fails", async () => {
      pool.query.mockResolvedValue({ rows: [] }); // No rows returned
      const result = await deleteTeam("999");
      expect(result).toBeUndefined(); // Because rows[0] of [] is undefined
    });
  });

  describe("getTeamMember", () => {
    it("Should return a specific member if they exist in the team", async () => {
      const teamId = "1",
        userId = "5";
      const returnedRow = { team_id: teamId, user_id: userId, role: "admin" };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await getTeamMember(teamId, userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM team_members"),
        [teamId, userId],
      );
      expect(result).toEqual(returnedRow);
    });
  });

  describe("addTeamMember", () => {
    it("Should insert a member and return the relation row", async () => {
      const teamId = "1",
        userId = "2",
        role = "member";
      const returnedRow = { team_id: teamId, user_id: userId, role };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await addTeamMember(teamId, userId, role);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO team_members"),
        [teamId, userId, role],
      );
      expect(result).toEqual(returnedRow);
    });
  });

  describe("activateTeamMember", () => {
    it("Should set is_active to TRUE and return the row", async () => {
      const memberId = "55";
      const returnedRow = { team_member_id: memberId, is_active: true };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await activateTeamMember(memberId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`UPDATE team_members SET is_active = TRUE`),
        [memberId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null and log error if activation fails", async () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Update failed"));

      const result = await activateTeamMember("55");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("deactivateTeamMember", () => {
    it("Should set is_active to FALSE and return the row", async () => {
      const memberId = "55";
      const returnedRow = { team_member_id: memberId, is_active: false };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await deactivateTeamMember(memberId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE team_members SET is_active = FALSE"),
        [memberId],
      );
      expect(result).toEqual(returnedRow);
    });
  });
});
