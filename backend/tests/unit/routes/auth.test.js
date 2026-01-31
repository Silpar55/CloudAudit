import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, jest } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils", () => {
  const actual = jest.requireActual("#utils");

  return {
    ...actual,
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
  };
});

import { hashPassword, comparePassword } from "#utils";
import { findUser, createUser } from "#modules/auth/auth.model.js";

import app from "#app";

describe("/auth", () => {
  const endpoint = "/auth";

  describe("POST /auth/signup", () => {
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

      // Invalid first name
      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, firstName: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("First name is invalid"));

      // Invalid last name
      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, lastName: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Last name is invalid"));

      // Invalid email
      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, email: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Email is invalid"));

      // Invalid phone number
      await request(app)
        .post(endpoint + "/signup")
        .send({ ...correctBody, phoneNumber: "", countryCode: "" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Phone number is invalid"),
        );

      // Invalid password
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
      hashPassword.mockResolvedValue("Hashed");
      createUser.mockResolvedValue(null);

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
      createUser.mockResolvedValue({ message: "User registered successfully" });

      await request(app)
        .post(endpoint + "/signup")
        .send(correctBody)
        .expect(201)
        .then((res) =>
          expect(res.body.message).toBe("User registered successfully"),
        );
    });
  });

  describe("POST /auth/login", () => {
    const correctBody = {
      email: "test@example.com",
      password: "Example0!",
    };
    it("Should handle invalid inputs", async () => {
      // Invalid email
      await request(app)
        .post(endpoint + "/login")
        .send({ ...correctBody, email: "" })
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Email is invalid"));

      // Invalid password
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
      // User exist and verify token is valid
      findUser.mockResolvedValue({
        user_id: 1321,
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
});
