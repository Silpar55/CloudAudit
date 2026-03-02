import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils/password.js");
jest.mock("jsonwebtoken");
jest.mock("#utils/aws/ses.js"); // FIXED: Mock SES to prevent real AWS calls

jest.mock("#utils/validation.js", () => ({
  validName: jest.fn().mockReturnValue(true),
  validEmail: jest.fn().mockReturnValue(true),
  validPassword: jest.fn().mockReturnValue([]),
  validPhone: jest.fn().mockReturnValue(true),
}));

import * as authService from "#modules/auth/auth.service.js";
import * as authModel from "#modules/auth/auth.model.js";
import { hashPassword, comparePassword } from "#utils/password.js";
import { validPassword } from "#utils/validation.js";
import { sendVerificationEmail } from "#utils/aws/ses.js"; // Import mocked SES
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

    it("Should successfully register a user and trigger verification email", async () => {
      authModel.findUser.mockResolvedValue(null);
      validPassword.mockReturnValue([]);
      hashPassword.mockResolvedValue("hashed");
      authModel.createUser.mockResolvedValue({
        user_id: "123",
        email: "john@test.com",
      });
      sendVerificationEmail.mockResolvedValue(true); // FIXED: Mock the SES success

      const result = await authService.registerUser(validData);

      // FIXED: Assert that the SES utility was called and the token is no longer returned
      expect(sendVerificationEmail).toHaveBeenCalledWith(
        "john@test.com",
        expect.any(String),
      );
      expect(result.message).toContain("Signup successful");
      expect(result.token).toBeUndefined(); // Token is no longer returned on signup
    });
  });

  describe("loginUser", () => {
    it("Should throw AppError if password validation fails", async () => {
      validPassword.mockReturnValue([{ message: "Too short" }]);

      await expect(
        authService.loginUser({ email: "test@email.com", password: "bad" }),
      ).rejects.toThrow(AppError);
    });

    it("Should throw AppError if email is not verified", async () => {
      authModel.findUser.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        password: "ok",
        email_verified: false, // NEW LOGIC: Simulated unverified user
      });
      validPassword.mockReturnValue([]);
      comparePassword.mockResolvedValue(true);

      await expect(
        authService.loginUser({ email: "test@email.com", password: "ok" }),
      ).rejects.toThrow("Please verify your email address before logging in.");
    });

    it("Should login successfully and return a token", async () => {
      authModel.findUser.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        password: "ok",
        email_verified: true, // FIXED: Added missing flag to pass validation
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

  // NEW LOGIC: Tests for the verifyEmailToken feature
  describe("verifyEmailToken", () => {
    it("Should throw AppError if token is invalid", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue(null);

      await expect(authService.verifyEmailToken("bad-token")).rejects.toThrow(
        "Invalid or expired verification token",
      );
    });

    it("Should throw AppError if token is expired", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue({
        verification_expires_at: new Date(Date.now() - 3600000), // 1 hour in the past
      });

      await expect(
        authService.verifyEmailToken("expired-token"),
      ).rejects.toThrow("Verification token has expired.");
    });

    it("Should verify email successfully and clear tokens", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        verification_expires_at: new Date(Date.now() + 3600000), // 1 hour in the future
      });
      authModel.verifyEmailAndClearToken.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        email_verified: true,
      });
      // NEW: Mock the jwt.sign since verifyEmailToken now auto-generates a token
      jwt.sign.mockReturnValue("new_jwt_token");

      const result = await authService.verifyEmailToken("good-token");
      expect(authModel.verifyEmailAndClearToken).toHaveBeenCalledWith(
        "123",
        "test@email.com",
      );

      // FIXED: Assert against result.user because the service now returns { user, accessToken }
      expect(result.user.email_verified).toBe(true);
      expect(result.accessToken).toBe("new_jwt_token");
    });
  });
});
