/**
 * CloudAudit — Unit tests for `team.model`.
 * Run from `backend/` with `npm test`.
 */

import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

jest.mock("#config");
import { pool } from "#config";
import {
  createTeam,
  getTeamsByUserId,
  getTeamById,
  updateTeam,
  updateTeamStatus,
  getTeamMemberById,
  addTeamMember,
  activateTeamMember,
  deactivateTeamMember,
  changeMemberRole,
  deleteTeam,
} from "#modules/team/team.model.js";

describe("Team Model", () => {
  const mockError = new Error("DB Error");
  let consoleErrorSpy, consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("createTeam", () => {
    it("Should insert a team and return the new team row", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "1", name: "Eng" }] });
      const result = await createTeam("Eng");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO teams"),
        ["Eng", null],
      );
      expect(result).toEqual({ team_id: "1", name: "Eng" });
    });

    it("Should catch DB errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await createTeam("Eng")).toBeNull();
    });
  });

  describe("getTeamsByUserId", () => {
    it("Should return a list of teams for a user", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "1" }] });
      const result = await getTeamsByUserId("user-1");
      expect(result).toEqual([{ team_id: "1" }]);
    });

    it("Should catch errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await getTeamsByUserId("user-1")).toBeNull();
    });
  });

  describe("getTeamById", () => {
    it("Should return a specific team", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "1", name: "Eng" }] });
      const result = await getTeamById("1");
      // FIXED: Matched the complex LEFT JOIN query in the source code
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM teams t\n    LEFT JOIN team_members tm"),
        ["1"],
      );
      expect(result).toEqual({ team_id: "1", name: "Eng" });
    });

    it("Should let errors bubble up (no try/catch in source)", async () => {
      // FIXED: Your actual code doesn't try/catch this, so it rejects.
      pool.query.mockRejectedValue(mockError);
      await expect(getTeamById("1")).rejects.toThrow("DB Error");
    });
  });

  describe("updateTeam", () => {
    it("Should dynamically build UPDATE query", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "1", name: "New" }] });
      const result = await updateTeam("1", {
        name: "New",
        description: "Desc",
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE teams"),
        ["New", "Desc", "1"],
      );
      expect(result).toBeDefined();
    });

    it("Should catch errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await updateTeam("1", { name: "New" })).toBeNull();
    });
  });

  describe("updateTeamStatus", () => {
    it("Should update the status of a team", async () => {
      pool.query.mockResolvedValue({
        rows: [{ team_id: "1", status: "active" }],
      });
      const result = await updateTeamStatus("1", "active");
      expect(result).toEqual({ team_id: "1", status: "active" });
    });
  });

  describe("getTeamMemberById", () => {
    it("Should return a specific member if they exist in the team", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "1", user_id: "5" }] });
      const result = await getTeamMemberById("1", "5");
      expect(result).toEqual({ team_id: "1", user_id: "5" });
    });
  });

  describe("addTeamMember", () => {
    it("Should add a user to a team", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_member_id: "tm-1" }] });
      const result = await addTeamMember("team-1", "user-1", "member");
      expect(result).toEqual({ team_member_id: "tm-1" });
    });
  });

  describe("activateTeamMember & deactivateTeamMember", () => {
    it("Should activate a team member", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_member_id: "tm-1" }] });
      expect(await activateTeamMember("tm-1")).toBeDefined();
    });

    it("Should catch errors for activateTeamMember", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await activateTeamMember("tm-1")).toBeNull();
    });

    it("Should deactivate a team member", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_member_id: "tm-1" }] });
      expect(await deactivateTeamMember("tm-1")).toBeDefined();
    });

    it("Should catch errors for deactivateTeamMember", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await deactivateTeamMember("tm-1")).toBeNull();
    });
  });

  describe("changeMemberRole", () => {
    it("Should change a member's role", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_member_id: "tm-1" }] });
      expect(await changeMemberRole("tm-1", "admin")).toBeDefined();
    });

    it("Should catch errors for changeMemberRole", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await changeMemberRole("tm-1", "admin")).toBeNull();
    });
  });

  describe("deleteTeam", () => {
    it("Should delete a team by ID", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "1" }] });
      expect(await deleteTeam("1")).toBeDefined();
    });
  });
});
