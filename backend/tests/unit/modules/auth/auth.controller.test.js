import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.service.js");
import * as authService from "#modules/auth/auth.service.js";
import {
  registerUser,
  loginUser,
  getUser,
  verifyEmail,
} from "#modules/auth/auth.controller.js";

describe("Auth Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("registerUser", () => {
    it("Should call authService.registerUser and return 201 without token", async () => {
      req.body = { email: "test@test.com", password: "password123" };
      const mockServiceResponse = {
        result: { user_id: "1" },
        message:
          "Signup successful. Please check your email to verify your account.",
      };
      authService.registerUser.mockResolvedValue(mockServiceResponse);

      await registerUser(req, res, next);

      expect(authService.registerUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message:
          "Signup successful. Please check your email to verify your account.",
        userId: "1",
      });
    });
  });

  describe("loginUser", () => {
    it("Should call authService.loginUser and return 200 with token", async () => {
      req.body = { email: "test@test.com", password: "password123" };
      authService.loginUser.mockResolvedValue("jwt-token");

      await loginUser(req, res, next);

      expect(authService.loginUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User logged successfully",
        token: "jwt-token",
      });
    });
  });

  describe("getUser", () => {
    it("Should return 401 if Authorization header is missing", async () => {
      await getUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Missing or invalid Authorization header",
        token: "invalid",
      });
    });

    it("Should call authService.getUser and return 200 with user data", async () => {
      req.headers.authorization = "Bearer valid-token";
      const mockUser = { user_id: "1", email: "test@test.com" };
      authService.getUser.mockResolvedValue(mockUser);

      await getUser(req, res, next);

      expect(authService.getUser).toHaveBeenCalledWith("valid-token");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User retrieved",
        user: mockUser,
      });
    });

    it("Should call next with error if authService.getUser throws", async () => {
      req.headers.authorization = "Bearer bad-token";
      const error = new Error("Invalid token");
      authService.getUser.mockRejectedValue(error);

      await getUser(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe("verifyEmail", () => {
    it("Should return 400 if verification token is missing in body", async () => {
      req.body = {}; // No token

      await verifyEmail(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Verification token is required",
      });
    });

    it("Should call authService.verifyEmailToken and return 200 with user and token", async () => {
      req.body = { token: "valid-hex-token" };
      const mockResponse = {
        user: { user_id: "1", email: "test@test.com" },
        accessToken: "new-jwt",
      };
      authService.verifyEmailToken.mockResolvedValue(mockResponse);

      await verifyEmail(req, res, next);

      expect(authService.verifyEmailToken).toHaveBeenCalledWith(
        "valid-hex-token",
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email address verified successfully.",
        user: mockResponse.user,
        token: mockResponse.accessToken,
      });
    });

    it("Should call next with error if service throws an exception", async () => {
      req.body = { token: "expired-token" };
      const error = new Error("Verification token has expired");
      authService.verifyEmailToken.mockRejectedValue(error);

      await verifyEmail(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
