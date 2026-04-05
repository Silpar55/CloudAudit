/**
 * CloudAudit — Unit tests for `team.route`.
 * Run from `backend/` with `npm test`.
 */

import request from "supertest";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/audit/audit.model.js", () => ({
  insertAuditLog: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("#modules/team/team.service.js");
jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");
  return {
    ...actual,
    verifyPermissions: jest.fn((req, res, next) => {
      req.teamMember = { role: "owner" };
      next();
    }),
    verifyToken: jest.fn((req, res, next) => {
      req.userId = "actor-user-id";
      next();
    }),
    verifyTeamId: jest.fn((req, res, next) => next()),
    verifyTeamMembership: jest.fn((req, res, next) => next()),
  };
});

import * as teamService from "#modules/team/team.service.js";
import app from "#app";
import { AppError } from "#utils/helper/AppError.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("/team", () => {
  const endpoint = "/api/teams";

  describe("POST /api/teams", () => {
    const url = `${endpoint}`;
    const body = { name: "New Team" };

    it("Should handle invalid inputs", async () => {
      teamService.createTeam.mockRejectedValueOnce(
        new AppError("Please enter a name", 400),
      );
      const response = await request(app).post(url).send({ name: "" });
      expect(response.status).toBe(400);
    });

    it("Should create a new team", async () => {
      teamService.createTeam.mockResolvedValueOnce("123");

      const response = await request(app).post(url).send(body);
      expect(response.status).toBe(201);
      expect(response.body.teamId).toBe("123");
    });
  });

  describe("DELETE /api/teams/:teamId", () => {
    const url = `${endpoint}`;

    it("Should throw error when teamId does not exist in the DB", async () => {
      teamService.deleteTeam.mockRejectedValueOnce(
        new AppError("Team does not exist", 404),
      );
      const teamId = "non-existence-id";
      const response = await request(app).delete(`${url}/${teamId}`);
      expect(response.status).toBe(404);
    });

    it("Should delete the team", async () => {
      const teamId = "123";
      teamService.deleteTeam.mockResolvedValueOnce(teamId);
      const response = await request(app).delete(`${url}/${teamId}`);
      expect(response.status).toBe(200);
      expect(response.body.deletedTeamId).toBe(teamId);
    });
  });

  describe("POST /api/teams/:teamId/members", () => {
    const url = `${endpoint}`;
    const teamId = "team-id";

    it("Should create an invitation when the email is not registered yet", async () => {
      teamService.inviteTeamMember.mockResolvedValueOnce({
        invitationId: "inv-open",
        invitedUserId: null,
        invitedEmail: "newcomer@test.com",
        inviteLink: "http://localhost:5173/invite/accept?token=abc",
        emailSent: true,
        message: "Invitation email sent.",
      });
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "newcomer@test.com" });

      expect(response.status).toBe(201);
      expect(response.body.invitationId).toBe("inv-open");
      expect(response.body.invitedUserId).toBeNull();
      expect(response.body.inviteLink).toContain("invite/accept");
    });

    it("Should throw error when user is already in the team and is active", async () => {
      teamService.inviteTeamMember.mockRejectedValueOnce(
        new AppError("User is already in the team", 400),
      );
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "activeUser@example.com" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("User is already in the team");
    });

    it("Should create an invitation when user was previously removed", async () => {
      teamService.inviteTeamMember.mockResolvedValueOnce({
        invitationId: "inv-123",
        invitedUserId: "user-123",
        invitedEmail: "unactiveUser@example.com",
      });
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "unactiveUser@example.com" });

      expect(response.status).toBe(201);
      expect(response.body.invitationId).toBe("inv-123");
    });

    it("Should create an invitation when user was never in the team", async () => {
      teamService.inviteTeamMember.mockResolvedValueOnce({
        invitationId: "inv-999",
        invitedUserId: "user-999",
        invitedEmail: "validUser@example.com",
      });
      const response = await request(app)
        .post(`${url}/${teamId}/members`)
        .send({ email: "validUser@example.com" });

      expect(response.status).toBe(201);
      expect(response.body.invitationId).toBe("inv-999");
    });
  });

  describe("DELETE /api/teams/:teamId/members/:userId", () => {
    const url = `${endpoint}`;
    const teamId = "team-id";

    it("Should throw error when user is not a member of that team", async () => {
      teamService.deactivateTeamMember.mockRejectedValueOnce(
        new AppError("User is not in the team", 404),
      );
      const response = await request(app).delete(
        `${url}/${teamId}/members/no-user-id`,
      );
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User is not in the team");
    });

    it("Should return 404 when target member is already inactive", async () => {
      teamService.deactivateTeamMember.mockRejectedValueOnce(
        new AppError("User is not in the team", 404),
      );
      const response = await request(app).delete(
        `${url}/${teamId}/members/unactive-user-id`,
      );
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User is not in the team");
    });

    it("Should remove the member correctly", async () => {
      teamService.deactivateTeamMember.mockResolvedValueOnce("tm-removed");
      const response = await request(app).delete(
        `${url}/${teamId}/members/active-user-id`,
      );
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Member removed from the team");
    });
  });

  describe("PATCH /api/teams/:teamId/members/:userId", () => {
    const url = `${endpoint}`;
    const teamId = "team-id";

    it("Should throw 400 when role is not a valid role", async () => {
      teamService.changeMemberRole.mockRejectedValueOnce(
        new AppError("This role does not exist", 400),
      );
      const response = await request(app)
        .patch(`${url}/${teamId}/members/user-id`)
        .send({ newRole: "NO VALID ROLE" });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("This role does not exist");
    });

    it("Should throw error when user is not in the team", async () => {
      teamService.changeMemberRole.mockRejectedValueOnce(
        new AppError("User is not in the team", 404),
      );
      const response = await request(app)
        .patch(`${url}/${teamId}/members/valid-user-id`)
        .send({ newRole: "admin" });
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User is not in the team");
    });

    it("Should change role successfully", async () => {
      teamService.changeMemberRole.mockResolvedValueOnce({
        teamMemberId: "tm-123",
        prevRole: "member",
        role: "admin",
      });
      const response = await request(app)
        .patch(`${url}/${teamId}/members/active-user-id`)
        .send({ newRole: "admin" });
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(`Member changed from member to admin`);
    });
  });
});
