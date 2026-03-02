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
    it("Should call authService.registerUser and return 201 without token", async () => {
      req.body = { email: "test@test.com", password: "password123" };

      // FIXED: Service now returns { result, message }
      const mockServiceResponse = {
        result: { user_id: "1" },
        message:
          "Signup successful. Please check your email to verify your account.",
      };
      authService.registerUser.mockResolvedValue(mockServiceResponse);

      await registerUser(req, res, next);

      expect(authService.registerUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(201);

      // FIXED: Controller no longer returns a token on signup, it returns the verification message
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
      // FIXED: Service only returns the token string
      authService.loginUser.mockResolvedValue("jwt-token");

      await loginUser(req, res, next);

      expect(authService.loginUser).toHaveBeenCalledWith(req.body);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "User logged successfully", // Matching your exact string
        token: "jwt-token",
      });
    });
  });
});
