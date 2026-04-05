/**
 * CloudAudit — Unit tests for `auth.controller`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.service.js");
import * as authService from "#modules/auth/auth.service.js";
import {
  deleteAccount,
  changePassword,
  requestPasswordReset,
  resetPassword,
} from "#modules/auth/auth.controller.js";

describe("Auth Controller — new features", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, headers: {}, userId: "123" };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("deleteAccount", () => {
    it("Should call authService.deleteAccount with req.userId and return 200", async () => {
      authService.deleteAccount.mockResolvedValue({
        message: "Account deactivated successfully.",
      });

      await deleteAccount(req, res, next);

      expect(authService.deleteAccount).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Account deactivated successfully.",
      });
    });

    it("Should call next with error if service throws", async () => {
      const error = new Error("User not found");
      authService.deleteAccount.mockRejectedValue(error);

      await deleteAccount(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("changePassword", () => {
    it("Should return 400 if currentPassword or newPassword is missing", async () => {
      req.body = { currentPassword: "OldPass1!" };

      await changePassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "currentPassword and newPassword are required.",
      });
    });

    it("Should call authService.changePassword with req.userId and return 200", async () => {
      req.body = { currentPassword: "OldPass1!", newPassword: "NewPass2@" };
      authService.changePassword.mockResolvedValue({
        message: "Password updated successfully.",
      });

      await changePassword(req, res, next);

      expect(authService.changePassword).toHaveBeenCalledWith("123", {
        currentPassword: "OldPass1!",
        newPassword: "NewPass2@",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password updated successfully.",
      });
    });

    it("Should call next with error if service throws", async () => {
      req.body = { currentPassword: "OldPass1!", newPassword: "NewPass2@" };
      const error = new Error("Current password is incorrect.");
      authService.changePassword.mockRejectedValue(error);

      await changePassword(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("requestPasswordReset", () => {
    it("Should return 400 if email is missing from body", async () => {
      req.body = {};

      await requestPasswordReset(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Email is required." });
    });

    it("Should call authService.requestPasswordReset and return 200", async () => {
      req.body = { email: "user@test.com" };
      authService.requestPasswordReset.mockResolvedValue({
        message:
          "If that email is registered, you will receive a reset link shortly.",
      });

      await requestPasswordReset(req, res, next);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(
        "user@test.com",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message:
          "If that email is registered, you will receive a reset link shortly.",
      });
    });

    it("Should call next with error if service throws", async () => {
      req.body = { email: "user@test.com" };
      const error = new Error("Email is invalid");
      authService.requestPasswordReset.mockRejectedValue(error);

      await requestPasswordReset(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("resetPassword", () => {
    it("Should return 400 if reset token is missing from body", async () => {
      req.body = { newPassword: "NewPass1!" };

      await resetPassword(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Reset token is required.",
      });
    });

    it("Should call authService.resetPassword and return 200", async () => {
      req.body = { token: "valid-reset-token", newPassword: "NewPass1!" };
      authService.resetPassword.mockResolvedValue({
        message: "Password reset successfully. You can now log in.",
      });

      await resetPassword(req, res, next);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        "valid-reset-token",
        "NewPass1!",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Password reset successfully. You can now log in.",
      });
    });

    it("Should call next with error if service throws", async () => {
      req.body = { token: "expired-token", newPassword: "NewPass1!" };
      const error = new Error("Reset token has expired.");
      authService.resetPassword.mockRejectedValue(error);

      await resetPassword(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
