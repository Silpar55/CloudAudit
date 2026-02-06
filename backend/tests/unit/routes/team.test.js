import request from "supertest";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#modules/team/team.model.js");
jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");
  return {
    ...actual,
    verifyPermissions: jest.fn((req, res, next) => next()),
    verifyToken: jest.fn((req, res, next) => next()),
    verifyTeamId: jest.fn((req, res, next) => next()),
  };
});

// Setup complex mock logic for specific scenarios
beforeEach(() => {
  findUser.mockImplementation((email) => {
    switch (email) {
      case "activeUser@example.com":
        return { user_id: "active-user-id" };
      case "unactiveUser@example.com":
        return { user_id: "unactive-user-id" };
      case "validUser@example.com":
        return { user_id: "valid-user-id" };
      default:
        return null;
    }
  });

  getTeamMember.mockImplementation((_, userId) => {
    switch (userId) {
      case "active-user-id":
        return {
          team_member_id: "team-member-id",
          is_active: true,
          role: "member",
        };
      case "unactive-user-id":
        return { team_member_id: "team-member-id", is_active: false };
      case "valid-user-id":
        return null;
    }
  });

  deactivateTeamMember.mockImplementation((memberId) => {
    return memberId === "team-member-id" ? { memberId } : null;
  });

  changeMemberRole.mockImplementation((memberId, _role) => {
    return memberId === "team-member-id" ? { memberId } : null;
  });

  addTeamMember.mockResolvedValue({ team_member_id: "add-team-member-id" });
  activateTeamMember.mockResolvedValue({
    team_member_id: "activate-team-member-id",
  });
});

import {
  createTeam,
  deleteTeam,
  addTeamMember,
  activateTeamMember,
  getTeamMember,
  deactivateTeamMember,
  changeMemberRole,
} from "#modules/team/team.model.js";
import { findUser } from "#modules/auth/auth.model.js";
import app from "#app";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("/team", () => {
  const endpoint = "/api/teams";

  describe("POST /api/teams", () => {
    const url = `${endpoint}`;
    const body = { name: "New Team" };

    it("Should handle invalid inputs", async () => {
      const response = await request(app).post(url).send({ name: "" });

      expect(response.status).toBe(400);
    });

    it("Should create a new team", async () => {
      createTeam.mockResolvedValueOnce({
        team_id: "123",
        user_id: "123",
        name: "New Team",
      });

      const response = await request(app).post(url).send(body);

      expect(response.status).toBe(201);
      expect(response.body.teamId).toBe("123");
    });
  });

  describe("DELETE /api/teams/:teamId", () => {
    const url = `${endpoint}`;

    it("Should throw error when teamId does not exist in the DB", async () => {
      // Simulate "Not Found" in the DB
      deleteTeam.mockResolvedValue(null);
      const teamId = "non-existence-id";

      const response = await request(app).delete(`${url}/${teamId}`);

      expect(response.status).toBe(404);
    });

    it("Should delete the team", async () => {
      const teamId = "123";
      deleteTeam.mockResolvedValueOnce({ team_id: teamId });

      const response = await request(app).delete(`${url}/${teamId}`);

      expect(response.status).toBe(201);
      expect(response.body.deletedTeamId).toBe(teamId);
    });
  });

  describe("POST /api/teams/:teamId/members", () => {
    const url = `${endpoint}`;
    const teamId = "team-id";

    it("Should throw error when user does not exist in the database", async () => {
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "unexistentUser@test.com" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User does not exist");
    });

    it("Should throw error when user is already in the team and is active", async () => {
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "activeUser@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User is already in the team");
    });

    it("Should reactivate member when user is unactive in the team", async () => {
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "unactiveUser@example.com" });

      expect(response.status).toBe(201);
      expect(addTeamMember).toHaveBeenCalledTimes(0);
      expect(activateTeamMember).toHaveBeenCalledTimes(1);
    });

    it("Should add a new member when user was never in the team", async () => {
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "validUser@example.com" });

      expect(response.status).toBe(201);
      expect(addTeamMember).toHaveBeenCalledTimes(1);
      expect(activateTeamMember).toHaveBeenCalledTimes(0);
    });
  });

  describe("DELETE /api/teams/:teamId/members/:userId", () => {
    const url = `${endpoint}`;
    const teamId = "team-id";

    it("Should throw error when user is not a member of that team", async () => {
      getTeamMember.mockResolvedValueOnce(null);

      const response = await request(app).delete(
        `${url}/${teamId}/members/no-user-id`,
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User is not in the team");
    });

    it("Should remove the member even if is already unactive", async () => {
      const response = await request(app).delete(
        `${url}/${teamId}/members/unactive-user-id`,
      );

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Member removed into the team");
    });

    it("Should remove the member correctly", async () => {
      const response = await request(app).delete(
        `${url}/${teamId}/members/active-user-id`,
      );

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Member removed into the team");
    });
  });

  describe("PATCH /api/teams/:teamId/members/:userId", () => {
    const url = `${endpoint}`;
    const teamId = "team-id";

    it("Should throw 404 when role is not a valid role", async () => {
      const response = await request(app)
        .patch(`${url}/${teamId}/members/user-id`)
        .send({
          newRole: "NO VALID ROLE",
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("This role does not exist");
    });

    it("Should throw error when user is not in the team", async () => {
      getTeamMember.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch(`${url}/${teamId}/members/valid-user-id`)
        .send({ newRole: "admin" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User is not in the team");
    });

    it("Should change role successfully", async () => {
      const response = await request(app)
        .patch(`${url}/${teamId}/members/active-user-id`)
        .send({ newRole: "admin" });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe(`Member change from member to admin`);
    });
  });
});
