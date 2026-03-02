import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, jest } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils/password.js");
jest.mock("#utils/aws/ses.js");

import { hashPassword, comparePassword } from "#utils/password.js";
import {
  findUser,
  createUser,
  getUserByVerificationToken,
  verifyEmailAndClearToken,
} from "#modules/auth/auth.model.js";
import { sendVerificationEmail } from "#utils/aws/ses.js";

import app from "#app";

describe("/auth", () => {
  const endpoint = "/api/auth";

  describe("POST /signup", () => {
    const correctBody = {
      firstName: "Alejandro",
      lastName: "Silva",
      email: "alesj501@gmail.com",
      phone: "4375994791",
      countryCode: "CA",
      password: "CloudAudit11!",
    };

    it("Should handle invalid inputs", async () => {
      hashPassword.mockResolvedValue("Hashed");
      createUser.mockResolvedValue(null);

      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, firstName: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("First name is invalid"));

      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, lastName: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Last name is invalid"));

      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, email: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Email is invalid"));

      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, phone: "", countryCode: "" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Phone number is invalid"),
        );

      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, password: "" })
        .expect(400)
        .then((res) =>
          expect(res.body.message.includes("Password is invalid")).toBe(true),
        );
    });

    it("Should not accept emails that are in the database", async () => {
      findUser.mockResolvedValue(correctBody);
      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, email: "test@example.com" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe(
            "Email already registered, try other email",
          ),
        );
    });

    it("Should create a user", async () => {
      findUser.mockResolvedValue(false);
      hashPassword.mockResolvedValue("Hashed");
      createUser.mockResolvedValue({ email: "test@test.com" });
      sendVerificationEmail.mockResolvedValue(true);

      await request(app)
        .post(endpoint + "/signup")
        .send(correctBody)
        .expect(201)
        .then((res) => expect(res.body.message).toContain("Signup successful"));
    });
  });

  describe("POST /login", () => {
    const correctBody = { email: "test@example.com", password: "Example0!" };

    it("Should handle invalid inputs", async () => {
      await request(app)
        .post(endpoint + "/login")
        .send({ ...correctBody, email: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Email is invalid"));

      await request(app)
        .post(endpoint + "/login")
        .send({ ...correctBody, password: "" })
        .expect(400)
        .then((res) =>
          expect(res.body.message.includes("Password is invalid")).toBe(true),
        );
    });

    it("Login with invalid credentials", async () => {
      findUser.mockResolvedValue(false);
      comparePassword.mockResolvedValue(false);

      await request(app)
        .post(endpoint + "/login")
        .send({ ...correctBody, email: "user@example.com" })
        .expect(404)
        .then((res) =>
          expect(res.body.message).toBe("Invalid credentials, try again"),
        );
    });

    it("Login with valid credentials", async () => {
      findUser.mockResolvedValue({
        user_id: 1321,
        email_verified: true,
        ...correctBody,
      });
      comparePassword.mockResolvedValue(true);

      await request(app)
        .post(endpoint + "/login")
        .send(correctBody)
        .expect(200)
        .then((res) => {
          const token = res.body.token;
          expect(!!jwt.verify(token, process.env.SECRETKEY)).toBe(true);
        });
    });
  });

  describe("POST /verify-email", () => {
    it("Should return 400 if token is missing", async () => {
      await request(app)
        .post(endpoint + "/verify-email")
        .send({})
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Verification token is required"),
        );
    });

    it("Should return 400 if token is invalid or expired", async () => {
      getUserByVerificationToken.mockResolvedValue(null);

      await request(app)
        .post(endpoint + "/verify-email")
        .send({ token: "invalid-token" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Invalid verification token"),
        );
    });

    it("Should return 200 and a token when verification succeeds", async () => {
      const fakeUser = {
        user_id: 1321,
        email: "test@example.com",
        verification_expires_at: new Date(Date.now() + 100000),
      };

      getUserByVerificationToken.mockResolvedValue(fakeUser);
      verifyEmailAndClearToken.mockResolvedValue({
        ...fakeUser,
        email_verified: true,
      });

      await request(app)
        .post(endpoint + "/verify-email")
        .send({ token: "valid-token" })
        .expect(200)
        .then((res) => {
          expect(res.body.message).toBe("Email address verified successfully.");
          expect(res.body.user.email_verified).toBe(true);
          expect(res.body.token).toBeDefined();
        });
    });
  });
});
