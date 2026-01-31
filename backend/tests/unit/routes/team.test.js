import request from "supertest";
import { describe, expect, it, jest } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#modules/team/team.model.js");
jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");
  return {
    ...actual,
    verifyPermissions: jest.fn((req, res, next) => next()),
    verifyToken: jest.fn((req, res, next) => next()),
  };
});

import {
  createTeam,
  deleteTeam,
  addTeamMember,
  activateTeamMember,
  getTeamMember,
  removeTeamMember,
} from "#modules/team/team.model.js";
import { findUser } from "#modules/auth/auth.model.js";

beforeEach(() => {
  jest.clearAllMocks();
});

import app from "#app";

describe("/team", () => {
  let endpoint = "/team";
  describe("POST /team/create", () => {
    const body = {
      name: "New Team",
    };
    const url = endpoint + "/create";

    it("Should handle invalid inputs", async () => {
      await request(app).post(url).send({ name: "" }).expect(400);
    });

    it("Should create a new taam", async () => {
      createTeam.mockResolvedValue({
        team_id: "123",
        user_id: "123",
        name: "New Team",
      });

      await request(app)
        .post(url)
        .send(body)
        .expect(201)
        .then((res) => {
          expect(res.body.teamId).toBe("123");
        });
    });
  });

  describe("DELETE /team/delete/:teamId", () => {
    const url = endpoint + "/delete";

    deleteTeam.mockImplementation((teamId) => {
      return teamId === "123" ? { team_id: teamId } : null;
    });

    it("Should throw error when teamId does not exist in the DB", async () => {
      const teamId = "non-existence-id";

      await request(app).delete(`${url}/${teamId}`).expect(404);
    });

    it("Should delete the team", async () => {
      const teamId = "123";

      await request(app)
        .delete(`${url}/${teamId}`)
        .expect(201)
        .then((res) => expect(res.body.teamId).toBe(teamId));
    });
  });

  describe("POST /team/add-member/:teamId", () => {
    const url = endpoint + "/add-member";
    const teamId = "team-id";

    findUser.mockImplementation((email) => {
      switch (email) {
        case "activeUser@example.com":
          return { user_id: "activeUser-id" };
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
        case "activeUser-id":
          return { team_member_id: "team-member-id", is_active: true }; // active user in team -> ERROR
        case "unactive-user-id":
          return { team_member_id: "team-member-id", is_active: false }; // unactive user in team -> REACTIVATE
        case "valid-user-id":
          return null; // valid user not in team -> NEW MEMBER
      }
    });

    addTeamMember.mockResolvedValue({ team_member_id: "add-team-member-id" });
    activateTeamMember.mockResolvedValue({
      team_member_id: "activate-team-member-id",
    });

    it("Should throw error when user does not exist in the database", async () => {
      await request(app)
        .post(`${url}/${teamId}`)
        .send({ email: "unexistentUser@test.com" })
        .expect(404)
        .then((res) => expect(res.body.message).toBe("User does not exist"));
    });

    it("Should throw error when user is already in the team and is active", async () => {
      await request(app)
        .post(`${url}/${teamId}`)
        .send({ email: "activeUser@example.com" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("User is already in the team"),
        );
    });

    it("Should reactivate member when user is unactive in the team", async () => {
      await request(app)
        .post(`${url}/${teamId}`)
        .send({ email: "unactiveUser@example.com" })
        .expect(201);

      expect(addTeamMember).toBeCalledTimes(0);
      expect(activateTeamMember).toBeCalledTimes(1);
    });

    it("Should add a new member when user was never in the team", async () => {
      await request(app)
        .post(`${url}/${teamId}`)
        .send({ email: "validUser@example.com" })
        .expect(201);

      expect(addTeamMember).toBeCalledTimes(1);
      expect(activateTeamMember).toBeCalledTimes(0);
    });
  });
});
