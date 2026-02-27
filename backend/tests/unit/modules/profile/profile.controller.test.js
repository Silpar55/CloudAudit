import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import * as profileController from "#modules/profile/profile.controller.js";
import * as profileService from "#modules/profile/profile.service.js";

jest.mock("#modules/profile/profile.service.js");

describe("Profile Controller - Email Verification", () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      userId: "user-1",
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe("requestEmailChange", () => {
    it("Should call service and return 200 on success", async () => {
      mockReq.body.new_email = "new@example.com";
      profileService.requestEmailChange.mockResolvedValue();

      await profileController.requestEmailChange(mockReq, mockRes, mockNext);

      expect(profileService.requestEmailChange).toHaveBeenCalledWith(
        "user-1",
        "new@example.com",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: expect.any(String),
      });
    });

    it("Should return 400 if new_email is missing", async () => {
      await profileController.requestEmailChange(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "New email address is required",
      });
      expect(profileService.requestEmailChange).not.toHaveBeenCalled();
    });
  });

  describe("verifyEmailChange", () => {
    it("Should call service with token and return updated profile", async () => {
      mockReq.body.token = "secure-token";
      profileService.verifyEmailChange.mockResolvedValue({
        email: "new@example.com",
      });

      await profileController.verifyEmailChange(mockReq, mockRes, mockNext);

      expect(profileService.verifyEmailChange).toHaveBeenCalledWith(
        "secure-token",
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith(
        expect.objectContaining({ profile: { email: "new@example.com" } }),
      );
    });

    it("Should return 400 if token is missing", async () => {
      await profileController.verifyEmailChange(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith({
        message: "Verification token is required",
      });
      expect(profileService.verifyEmailChange).not.toHaveBeenCalled();
    });
  });
});
