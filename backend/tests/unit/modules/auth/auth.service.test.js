import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils/password.js");
jest.mock("jsonwebtoken"); // FIXED: Mocking jwt directly
// FIXED: Mocking all required validation functions
jest.mock("#utils/validation.js", () => ({
  validName: jest.fn().mockReturnValue(true),
  validEmail: jest.fn().mockReturnValue(true),
  validPassword: jest.fn().mockReturnValue([]), // Returns empty array on success
  validPhone: jest.fn().mockReturnValue(true),
}));

import * as authService from "#modules/auth/auth.service.js";
import * as authModel from "#modules/auth/auth.model.js";
import { hashPassword, comparePassword } from "#utils/password.js";
import { validPassword } from "#utils/validation.js";
import jwt from "jsonwebtoken";
import { AppError } from "#utils/helper/AppError.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Auth Service", () => {
  describe("registerUser", () => {
    const validData = {
      email: "john@test.com",
      phone: "123",
      countryCode: "US",
    };

    it("Should throw AppError if user already exists", async () => {
      authModel.findUser.mockResolvedValue({ user_id: "123" });

      await expect(authService.registerUser(validData)).rejects.toThrow(
        new AppError("Email already registered, try other email", 400),
      );
    });

    it("Should successfully register a user and return a token", async () => {
      authModel.findUser.mockResolvedValue(null);
      validPassword.mockReturnValue([]);
      hashPassword.mockResolvedValue("hashed");
      authModel.createUser.mockResolvedValue({
        user_id: "123",
        email: "john@test.com",
      });
      jwt.sign.mockReturnValue("jwt_token"); // FIXED: Mocking jwt.sign

      const result = await authService.registerUser(validData);
      expect(result.token).toBe("jwt_token");
    });
  });

  describe("loginUser", () => {
    it("Should throw AppError if password validation fails", async () => {
      // FIXED: Matching your custom password validation logic
      validPassword.mockReturnValue([{ message: "Too short" }]);

      await expect(
        authService.loginUser({ email: "test@email.com", password: "bad" }),
      ).rejects.toThrow(AppError);
    });

    it("Should login successfully and return a token", async () => {
      authModel.findUser.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        password: "ok",
      });
      validPassword.mockReturnValue([]);
      comparePassword.mockResolvedValue(true);
      jwt.sign.mockReturnValue("jwt_token");

      const result = await authService.loginUser({
        email: "test@email.com",
        password: "ok",
      });
      expect(result).toBe("jwt_token");
    });
  });
});
