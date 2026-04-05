/**
 * CloudAudit — Unit tests for `auth.service`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils/password.js");
jest.mock("#utils/aws/ses.js");

jest.mock("#utils/validation.js", () => ({
  validName: jest.fn().mockReturnValue(true),
  validEmail: jest.fn().mockReturnValue(true),
  validPassword: jest.fn().mockReturnValue([]),
  validPhone: jest.fn().mockReturnValue(true),
}));

import * as authService from "#modules/auth/auth.service.js";
import * as authModel from "#modules/auth/auth.model.js";
import { hashPassword, comparePassword } from "#utils/password.js";
import { validPassword, validEmail } from "#utils/validation.js";
import { sendPasswordResetEmail } from "#utils/aws/ses.js";
import { AppError } from "#utils/helper/AppError.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Auth Service — new features", () => {
  describe("deleteAccount", () => {
    it("Should throw AppError if user is not found", async () => {
      authModel.findUserById.mockResolvedValue(null);
      await expect(authService.deleteAccount("123")).rejects.toThrow(
        "User not found",
      );
    });

    it("Should throw AppError if account is already deactivated", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        is_active: false,
      });
      await expect(authService.deleteAccount("123")).rejects.toThrow(
        "Account is already deactivated.",
      );
    });

    it("Should deactivate memberships and user and return success message", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        is_active: true,
      });
      authModel.deactivateUserTeamMemberships.mockResolvedValue([]);
      authModel.deactivateUser.mockResolvedValue({
        user_id: "123",
        is_active: false,
      });

      const result = await authService.deleteAccount("123");

      expect(authModel.deactivateUserTeamMemberships).toHaveBeenCalledWith(
        "123",
      );
      expect(authModel.deactivateUser).toHaveBeenCalledWith("123");
      expect(result.message).toBe("Account deactivated successfully.");
    });

    it("Should throw AppError if deactivateUser returns null", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        is_active: true,
      });
      authModel.deactivateUserTeamMemberships.mockResolvedValue([]);
      authModel.deactivateUser.mockResolvedValue(null);

      await expect(authService.deleteAccount("123")).rejects.toThrow(
        "Failed to deactivate account.",
      );
    });
  });

  describe("changePassword", () => {
    const passwords = {
      currentPassword: "OldPass1!",
      newPassword: "NewPass2@",
    };

    it("Should throw AppError if user is not found", async () => {
      authModel.findUserById.mockResolvedValue(null);
      await expect(
        authService.changePassword("123", passwords),
      ).rejects.toThrow("User not found");
    });

    it("Should throw AppError if current password is incorrect", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        password: "hashed",
      });
      comparePassword.mockResolvedValue(false);

      await expect(
        authService.changePassword("123", passwords),
      ).rejects.toThrow("Current password is incorrect.");
    });

    it("Should throw AppError if new password fails validation", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        password: "hashed",
      });
      comparePassword.mockResolvedValue(true);
      validPassword.mockReturnValue([{ message: "Too short" }]);

      await expect(
        authService.changePassword("123", passwords),
      ).rejects.toThrow(AppError);
    });

    it("Should throw AppError if new password is the same as the current one", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        password: "hashed",
      });
      comparePassword.mockResolvedValue(true);
      validPassword.mockReturnValue([]);

      await expect(
        authService.changePassword("123", {
          currentPassword: "SamePass1!",
          newPassword: "SamePass1!",
        }),
      ).rejects.toThrow(
        "New password must be different from the current password.",
      );
    });

    it("Should update password and return success message", async () => {
      authModel.findUserById.mockResolvedValue({
        user_id: "123",
        password: "hashed",
      });
      comparePassword.mockResolvedValue(true);
      validPassword.mockReturnValue([]);
      hashPassword.mockResolvedValue("hashed-new");
      authModel.updateUserPassword.mockResolvedValue({
        user_id: "123",
        email: "test@test.com",
      });

      const result = await authService.changePassword("123", passwords);

      expect(hashPassword).toHaveBeenCalledWith(passwords.newPassword);
      expect(authModel.updateUserPassword).toHaveBeenCalledWith(
        "123",
        "hashed-new",
      );
      expect(result.message).toBe("Password updated successfully.");
    });
  });

  describe("requestPasswordReset", () => {
    it("Should throw AppError if email is invalid", async () => {
      validEmail.mockReturnValue(false);
      await expect(
        authService.requestPasswordReset("bad-email"),
      ).rejects.toThrow("Email is invalid");
    });

    it("Should return generic message if user is not found", async () => {
      validEmail.mockReturnValue(true);
      authModel.findUser.mockResolvedValue(null);

      const result = await authService.requestPasswordReset("ghost@test.com");

      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toBe(
        "If that email is registered, you will receive a reset link shortly.",
      );
    });

    it("Should return generic message if account is deactivated", async () => {
      validEmail.mockReturnValue(true);
      authModel.findUser.mockResolvedValue({
        user_id: "123",
        is_active: false,
      });

      const result = await authService.requestPasswordReset(
        "deactivated@test.com",
      );

      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
      expect(result.message).toBe(
        "If that email is registered, you will receive a reset link shortly.",
      );
    });

    it("Should store reset token and send email for a valid active user", async () => {
      validEmail.mockReturnValue(true);
      authModel.findUser.mockResolvedValue({
        user_id: "123",
        email: "test@test.com",
        is_active: true,
      });
      authModel.setPasswordResetToken.mockResolvedValue({ user_id: "123" });
      sendPasswordResetEmail.mockResolvedValue(true);

      const result = await authService.requestPasswordReset("test@test.com");

      expect(authModel.setPasswordResetToken).toHaveBeenCalledWith(
        "123",
        expect.any(String),
        expect.any(Date),
      );
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        "test@test.com",
        expect.any(String),
      );
      expect(result.message).toBe(
        "If that email is registered, you will receive a reset link shortly.",
      );
    });
  });

  describe("resetPassword", () => {
    it("Should throw AppError if token is missing", async () => {
      await expect(
        authService.resetPassword(null, "NewPass1!"),
      ).rejects.toThrow("Reset token is required.");
    });

    it("Should throw AppError if new password fails validation", async () => {
      validPassword.mockReturnValue([{ message: "Too short" }]);
      await expect(
        authService.resetPassword("some-token", "bad"),
      ).rejects.toThrow(AppError);
    });

    it("Should throw AppError if token is not found in DB", async () => {
      validPassword.mockReturnValue([]);
      authModel.getUserByVerificationToken.mockResolvedValue(null);

      await expect(
        authService.resetPassword("invalid-token", "NewPass1!"),
      ).rejects.toThrow("Invalid or expired reset token.");
    });

    it("Should throw AppError if token was already used", async () => {
      validPassword.mockReturnValue([]);
      authModel.getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        verification_used_at: new Date(),
        verification_expires_at: new Date(Date.now() + 3600000),
      });

      await expect(
        authService.resetPassword("used-token", "NewPass1!"),
      ).rejects.toThrow("This reset link has already been used.");
    });

    it("Should throw AppError if token is expired", async () => {
      validPassword.mockReturnValue([]);
      authModel.getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        verification_used_at: null,
        verification_expires_at: new Date(Date.now() - 3600000),
      });

      await expect(
        authService.resetPassword("expired-token", "NewPass1!"),
      ).rejects.toThrow("Reset token has expired. Please request a new one.");
    });

    it("Should reset password and return success message", async () => {
      validPassword.mockReturnValue([]);
      authModel.getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        verification_used_at: null,
        verification_expires_at: new Date(Date.now() + 3600000),
      });
      hashPassword.mockResolvedValue("hashed-new");
      authModel.resetPasswordAndClearToken.mockResolvedValue({
        user_id: "123",
        email: "test@test.com",
      });

      const result = await authService.resetPassword(
        "valid-token",
        "NewPass1!",
      );

      expect(hashPassword).toHaveBeenCalledWith("NewPass1!");
      expect(authModel.resetPasswordAndClearToken).toHaveBeenCalledWith(
        "123",
        "hashed-new",
      );
      expect(result.message).toBe(
        "Password reset successfully. You can now log in.",
      );
    });
  });
});
