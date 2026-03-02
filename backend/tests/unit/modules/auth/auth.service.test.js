import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils/password.js");
jest.mock("jsonwebtoken");
jest.mock("#utils/aws/ses.js");

jest.mock("#utils/validation.js", () => ({
  validName: jest.fn().mockReturnValue(true),
  validEmail: jest.fn().mockReturnValue(true),
  validPassword: jest.fn().mockReturnValue([]),
  validPhone: jest.fn().mockReturnValue(true),
}));

jest.mock("#utils/helper/jwt-helper.js", () => ({
  verifyJwtHelper: jest.fn().mockReturnValue({ userId: "123" }),
}));

import * as authService from "#modules/auth/auth.service.js";
import * as authModel from "#modules/auth/auth.model.js";
import { hashPassword, comparePassword } from "#utils/password.js";
import { validPassword } from "#utils/validation.js";
import { sendVerificationEmail } from "#utils/aws/ses.js";
import { verifyJwtHelper } from "#utils/helper/jwt-helper.js";
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
      sendVerificationEmail.mockResolvedValue(true);

      const result = await authService.registerUser(validData);

      expect(sendVerificationEmail).toHaveBeenCalledWith(
        "john@test.com",
        expect.any(String),
      );
      expect(result.message).toContain("Signup successful");
      expect(result.token).toBeUndefined();
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
        email_verified: false,
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
        email_verified: true,
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

  describe("getUser", () => {
    it("Should throw AppError if token is missing", async () => {
      await expect(authService.getUser(null)).rejects.toThrow("Access denied");
    });

    it("Should decode token and return user", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
      });
      const result = await authService.getUser("valid-token");

      expect(verifyJwtHelper).toHaveBeenCalledWith("valid-token");
      expect(authModel.findUserById).toHaveBeenCalledWith("123");
      expect(result.email).toBe("test@email.com");
    });
  });

  describe("verifyEmailToken", () => {
    it("Should throw AppError if token is invalid", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue(null);
      await expect(authService.verifyEmailToken("bad-token")).rejects.toThrow(
        "Invalid verification token",
      );
    });

    it("Should return an access token instantly if verification was already used", async () => {
      const mockUser = {
        user_id: "123",
        email: "test@email.com",
        verification_used_at: new Date(),
      };
      authModel.getUserByVerificationToken.mockResolvedValue(mockUser);
      jwt.sign.mockReturnValue("existing_jwt_token");

      const result = await authService.verifyEmailToken("already-used-token");

      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBe("existing_jwt_token");
      expect(authModel.verifyEmailAndClearToken).not.toHaveBeenCalled();
    });

    it("Should throw AppError if token is expired", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue({
        verification_expires_at: new Date(Date.now() - 3600000),
      });
      await expect(
        authService.verifyEmailToken("expired-token"),
      ).rejects.toThrow("Verification token has expired.");
    });

    it("Should prioritize pending_email if it exists, clear tokens and verify", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        email: "old@email.com",
        pending_email: "new@email.com",
        verification_expires_at: new Date(Date.now() + 3600000),
      });
      authModel.verifyEmailAndClearToken.mockResolvedValue({
        user_id: "123",
        email: "new@email.com",
        email_verified: true,
      });
      jwt.sign.mockReturnValue("new_jwt_token");

      const result = await authService.verifyEmailToken("good-token");

      expect(authModel.verifyEmailAndClearToken).toHaveBeenCalledWith(
        "123",
        "new@email.com",
      );
      expect(result.user.email).toBe("new@email.com");
      expect(result.accessToken).toBe("new_jwt_token");
    });

    it("Should use current email if pending_email does not exist", async () => {
      authModel.getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        pending_email: null,
        verification_expires_at: new Date(Date.now() + 3600000),
      });
      authModel.verifyEmailAndClearToken.mockResolvedValue({
        user_id: "123",
        email: "test@email.com",
        email_verified: true,
      });
      jwt.sign.mockReturnValue("new_jwt_token");

      await authService.verifyEmailToken("good-token");

      expect(authModel.verifyEmailAndClearToken).toHaveBeenCalledWith(
        "123",
        "test@email.com",
      );
    });
  });
});
