/**
 * CloudAudit — Unit tests for `profile.route`.
 * Run from `backend/` with `npm test`.
 */

import request from "supertest";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the model to intercept DB calls
jest.mock("#modules/profile/profile.model.js");

// Mock middleware, injecting a dynamic userId via headers to test different user states
jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");
  return {
    ...actual,
    verifyToken: jest.fn((req, res, next) => {
      req.userId = req.headers["x-test-user-id"] || "valid-user-id";
      next();
    }),
  };
});

import {
  getProfileById,
  updateProfile,
} from "#modules/profile/profile.model.js";
import app from "#app";

beforeEach(() => {
  jest.clearAllMocks();

  // Setup dynamic mock implementations based on the injected userId
  getProfileById.mockImplementation((userId) => {
    switch (userId) {
      case "valid-user-id":
        return {
          user_id: "valid-user-id",
          first_name: "Test",
          last_name: "User",
          email: "test@example.com",
        };
      case "not-found-user-id":
        return null;
      default:
        return null;
    }
  });

  updateProfile.mockImplementation((userId, data) => {
    if (userId === "valid-user-id") {
      return { user_id: userId, ...data };
    }
    return null;
  });
});

describe("/profile", () => {
  const endpoint = "/api/profile"; // Ensure this matches where you mount it in app.js or modules/index.js

  describe("GET /api/profile", () => {
    it("Should return 200 and the profile data for a valid user", async () => {
      const response = await request(app)
        .get(endpoint)
        .set("x-test-user-id", "valid-user-id");

      expect(response.status).toBe(200);
      expect(response.body.profile).toBeDefined();
      expect(response.body.profile.user_id).toBe("valid-user-id");
      expect(response.body.profile.email).toBe("test@example.com");
    });

    it("Should throw a 404 AppError when the profile is not found in the DB", async () => {
      const response = await request(app)
        .get(endpoint)
        .set("x-test-user-id", "not-found-user-id");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("User profile not found");
    });
  });

  describe("PATCH /api/profile", () => {
    it("Should return 200 and update successfully with a full payload", async () => {
      const payload = {
        first_name: "Updated",
        last_name: "Name",
        phone: "5551234567",
        country_code: "US",
      };

      const response = await request(app)
        .patch(endpoint)
        .set("x-test-user-id", "valid-user-id")
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Profile updated successfully");
      expect(response.body.profile.first_name).toBe("Updated");
      expect(response.body.profile.country_code).toBe("US");
    });

    it("Should return 200 and update successfully with a partial payload", async () => {
      const payload = { phone: "9998887777" };

      const response = await request(app)
        .patch(endpoint)
        .set("x-test-user-id", "valid-user-id")
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.profile.phone).toBe("9998887777");
      // first_name shouldn't be overridden in the mock response if we only passed phone
      expect(response.body.profile.first_name).toBeUndefined();
    });

    it("Should throw a 404 error if the update operation fails or user does not exist", async () => {
      const payload = { first_name: "Ghost" };

      const response = await request(app)
        .patch(endpoint)
        .set("x-test-user-id", "not-found-user-id")
        .send(payload);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Profile not found or update failed");
    });
  });
});
