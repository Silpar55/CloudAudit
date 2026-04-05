/**
 * CloudAudit — Unit tests for `profile.service`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/profile/profile.model.js");
jest.mock("#utils/aws/ses.js");

import * as profileService from "#modules/profile/profile.service.js";
import * as profileModel from "#modules/profile/profile.model.js";
import * as sesUtil from "#utils/aws/ses.js";

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
});
