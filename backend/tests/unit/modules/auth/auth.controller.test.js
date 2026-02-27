import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/auth/auth.service.js");
import * as authService from "#modules/auth/auth.service.js";
import { registerUser, loginUser } from "#modules/auth/auth.controller.js";

describe("Auth Controller", () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe("registerUser", () => {
    it("Should call authService.registerUser and return 201 with token", async () => {
      req.body = { email: "test@test.com", password: "password123" };
      // FIXED: Service returns user_id
      const mockResult = { user_id: "1", token: "jwt-token" };
      authService.registerUser.mockResolvedValue(mockResult);

      await registerUser(req, res, next);

      expect(authService.registerUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "User registered successfully",
        userId: "1",
        token: "jwt-token",
      });
    });
  });

  describe("loginUser", () => {
    it("Should call authService.loginUser and return 200 with token", async () => {
      req.body = { email: "test@test.com", password: "password123" };
      // FIXED: Service only returns the token string
      authService.loginUser.mockResolvedValue("jwt-token");

      await loginUser(req, res, next);

      expect(authService.loginUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User loged successfully", // Matching your exact string
        token: "jwt-token",
      });
    });
  });
});
