import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, jest } from "@jest/globals";

jest.unstable_mockModule("../../../src/models/user.model.js", () => ({
  createUser: jest.fn(),
  findUser: jest.fn(),
}));

// 1. Mock your new Password Wrapper
jest.unstable_mockModule("../../../src/utils/password.js", () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

const { hashPassword, comparePassword } =
  await import("../../../src/utils/password.js");
const { createUser, findUser } =
  await import("../../../src/models/user.model.js");
const app = (await import("../../../src/server.js")).default;

describe("POST /auth/", () => {
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

    test("Should handle invalid inputs", async () => {
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

    test("Should not accept emails that are in the database", async () => {
      findUser.mockResolvedValue(correctBody);
      hashPassword.mockResolvedValue("Hashed");
      createUser.mockResolvedValue(null); // safe default

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

    test("Should create a user", async () => {
      findUser.mockResolvedValue(false);
      hashPassword.mockResolvedValue("Hashed");
      createUser.mockResolvedValue({ message: "User registered succesfully" });

      await request(app)
        .post(endpoint + "/signup")
        .send(correctBody)
        .expect(201)
        .then((res) =>
          expect(res.body.message).toBe("User registered succesfully"),
        );
    });
  });

  describe("POST /auth/login", () => {
    const correctBody = {
      email: "test@example.com",
      password: "Example0!",
    };
    test("Should handle invalid inputs", async () => {
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

    test("Login with invalid credentials", async () => {
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

    test("Login with valid credentials", async () => {
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
