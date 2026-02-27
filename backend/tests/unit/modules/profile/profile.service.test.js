import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/profile/profile.model.js");
jest.mock("#utils/aws/ses.js");

import * as profileService from "#modules/profile/profile.service.js";
import * as profileModel from "#modules/profile/profile.model.js";
import * as sesUtil from "#utils/aws/ses.js";
import { AppError } from "#utils/helper/AppError.js";

describe("Profile Service - Email Verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("requestEmailChange", () => {
    it("Should generate a token, save to DB, and trigger SES", async () => {
      profileModel.setPendingEmail.mockResolvedValue(true);
      sesUtil.sendVerificationEmail.mockResolvedValue(true);

      const result = await profileService.requestEmailChange(
        "user-1",
        "new@example.com",
      );

      expect(profileModel.setPendingEmail).toHaveBeenCalled();
      expect(sesUtil.sendVerificationEmail).toHaveBeenCalledWith(
        "new@example.com",
        expect.any(String),
      );
      expect(result.message).toBe("Verification email sent");
    });
  });

  describe("verifyEmailChange", () => {
    it("Should confirm email change if token is valid and not expired", async () => {
      // Set expiration to 1 hour in the future
      const futureDate = new Date(Date.now() + 3600000);

      profileModel.getUserByVerificationToken.mockResolvedValue({
        id: "user-1",
        pending_email: "new@example.com",
        verification_expires_at: futureDate,
      });
      profileModel.confirmEmailChange.mockResolvedValue({
        email: "new@example.com",
      });

      const result = await profileService.verifyEmailChange("valid-token");

      expect(profileModel.confirmEmailChange).toHaveBeenCalledWith(
        "user-1",
        "new@example.com",
      );
      expect(result.email).toBe("new@example.com");
    });

    it("Should throw AppError if token does not exist", async () => {
      profileModel.getUserByVerificationToken.mockResolvedValue(null);

      await expect(
        profileService.verifyEmailChange("invalid-token"),
      ).rejects.toThrow(AppError);
      await expect(
        profileService.verifyEmailChange("invalid-token"),
      ).rejects.toThrow("Invalid or expired verification token");
    });

    it("Should throw AppError if token is expired", async () => {
      // Set expiration to 1 hour in the past
      const pastDate = new Date(Date.now() - 3600000);

      profileModel.getUserByVerificationToken.mockResolvedValue({
        id: "user-1",
        verification_expires_at: pastDate,
      });

      await expect(
        profileService.verifyEmailChange("expired-token"),
      ).rejects.toThrow(AppError);
      await expect(
        profileService.verifyEmailChange("expired-token"),
      ).rejects.toThrow("Verification token has expired");
      expect(profileModel.confirmEmailChange).not.toHaveBeenCalled();
    });
  });
});
