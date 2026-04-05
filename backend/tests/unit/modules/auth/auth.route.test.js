/**
 * CloudAudit — Unit tests for `auth.route`.
 * Run from `backend/` with `npm test`.
 */

import request from "supertest";
import jwt from "jsonwebtoken";
import { describe, expect, jest, it } from "@jest/globals";

jest.mock("#modules/auth/auth.model.js");
jest.mock("#utils/password.js");
jest.mock("#utils/aws/ses.js");

import {
  findUser,
  findUserById,
  deactivateUser,
  deactivateUserTeamMemberships,
  updateUserPassword,
  getUserByVerificationToken,
  setPasswordResetToken,
  resetPasswordAndClearToken,
} from "#modules/auth/auth.model.js";
import { hashPassword, comparePassword } from "#utils/password.js";
import { sendPasswordResetEmail } from "#utils/aws/ses.js";

import app from "#app";

describe("/auth — new features", () => {
  const endpoint = "/api/auth";

  // FIX: Align the mock token generator with the new JWT architecture
  process.env.JWT_SECRET = "test-secret-key";
  const makeToken = () =>
    jwt.sign({ id: "123" }, process.env.JWT_SECRET, { expiresIn: "1h" });

  describe("DELETE /account", () => {
    it("Should return 401 if no Authorization header is provided", async () => {
      await request(app)
        .delete(endpoint + "/account")
        .expect(401)
        .then((res) =>
          // Updated to match your actual middleware rejection message
          expect(res.body.message).toBe(
            "Missing or invalid Authorization header",
          ),
        );
    });

    it("Should return 200 and deactivate the account", async () => {
      findUserById.mockResolvedValue({ user_id: "123", is_active: true });
      deactivateUser.mockResolvedValue({});
      deactivateUserTeamMemberships.mockResolvedValue({});

      await request(app)
        .delete(endpoint + "/account")
        .set("Authorization", `Bearer ${makeToken()}`)
        .expect(200)
        .then((res) =>
          expect(res.body.message).toBe("Account deactivated successfully."),
        );
    });

    it("Should return 400 if account is already deactivated", async () => {
      findUserById.mockResolvedValue({ user_id: "123", is_active: false });

      await request(app)
        .delete(endpoint + "/account")
        .set("Authorization", `Bearer ${makeToken()}`)
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Account is already deactivated."),
        );
    });
  });

  describe("PATCH /password", () => {
    it("Should return 400 if currentPassword or newPassword is missing", async () => {
      await request(app)
        .patch(endpoint + "/password")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ currentPassword: "OldPass1!" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe(
            "currentPassword and newPassword are required.",
          ),
        );
    });

    it("Should return 400 if current password is incorrect", async () => {
      findUserById.mockResolvedValue({
        user_id: "123",
        password: "hashed-old",
      });
      comparePassword.mockResolvedValue(false);

      await request(app)
        .patch(endpoint + "/password")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ currentPassword: "WrongPass1!", newPassword: "NewPass2@" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Current password is incorrect."),
        );
    });

    it("Should return 200 on successful password change", async () => {
      findUserById.mockResolvedValue({
        user_id: "123",
        password: "hashed-old",
      });
      comparePassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue("hashed-new");
      updateUserPassword.mockResolvedValue({
        user_id: "123",
        email: "test@test.com",
      });

      await request(app)
        .patch(endpoint + "/password")
        .set("Authorization", `Bearer ${makeToken()}`)
        .send({ currentPassword: "OldPass1!", newPassword: "NewPass2@" })
        .expect(200)
        .then((res) =>
          expect(res.body.message).toBe("Password updated successfully."),
        );
    });
  });

  describe("POST /forgot-password", () => {
    it("Should return 400 if email is missing", async () => {
      await request(app)
        .post(endpoint + "/forgot-password")
        .send({})
        .expect(400)
        .then((res) => expect(res.body.message).toBe("Email is required."));
    });

    it("Should return 200 and success message even if email is not found (security)", async () => {
      findUser.mockResolvedValue(null);

      await request(app)
        .post(endpoint + "/forgot-password")
        .send({ email: "notfound@test.com" })
        .expect(200)
        .then((res) =>
          expect(res.body.message).toBe(
            "If that email is registered, you will receive a reset link shortly.",
          ),
        );
    });

    it("Should set token and send email if user exists", async () => {
      findUser.mockResolvedValue({ user_id: "123", email: "found@test.com" });
      setPasswordResetToken.mockResolvedValue({});
      sendPasswordResetEmail.mockResolvedValue({});

      await request(app)
        .post(endpoint + "/forgot-password")
        .send({ email: "found@test.com" })
        .expect(200)
        .then((res) =>
          expect(res.body.message).toBe(
            "If that email is registered, you will receive a reset link shortly.",
          ),
        );

      expect(setPasswordResetToken).toHaveBeenCalled();
      expect(sendPasswordResetEmail).toHaveBeenCalled();
    });
  });

  describe("POST /reset-password", () => {
    it("Should return 400 if token is missing", async () => {
      await request(app)
        .post(endpoint + "/reset-password")
        .send({ newPassword: "NewPass1!" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Reset token is required."),
        );
    });

    it("Should return 400 if token is invalid or user inactive", async () => {
      getUserByVerificationToken.mockResolvedValue(null);

      await request(app)
        .post(endpoint + "/reset-password")
        .send({ token: "invalid-token", newPassword: "NewPass1!" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe("Invalid or expired reset token."),
        );
    });

    it("Should return 400 if token is already used", async () => {
      getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        verification_used_at: new Date(),
      });

      await request(app)
        .post(endpoint + "/reset-password")
        .send({ token: "used-token", newPassword: "NewPass1!" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe(
            "This reset link has already been used.",
          ),
        );
    });

    it("Should return 400 if token is expired", async () => {
      getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        verification_used_at: null,
        verification_expires_at: new Date(Date.now() - 3600000),
      });

      await request(app)
        .post(endpoint + "/reset-password")
        .send({ token: "expired-token", newPassword: "NewPass1!" })
        .expect(400)
        .then((res) =>
          expect(res.body.message).toBe(
            "Reset token has expired. Please request a new one.",
          ),
        );
    });

    it("Should return 200 on successful password reset", async () => {
      getUserByVerificationToken.mockResolvedValue({
        user_id: "123",
        verification_used_at: null,
        verification_expires_at: new Date(Date.now() + 3600000),
      });
      hashPassword.mockResolvedValue("hashed-new");
      resetPasswordAndClearToken.mockResolvedValue({
        user_id: "123",
        email: "test@test.com",
      });

      await request(app)
        .post(endpoint + "/reset-password")
        .send({ token: "valid-token", newPassword: "NewPass1!" })
        .expect(200)
        .then((res) =>
          expect(res.body.message).toBe(
            "Password reset successfully. You can now log in.",
          ),
        );
    });
  });
});
