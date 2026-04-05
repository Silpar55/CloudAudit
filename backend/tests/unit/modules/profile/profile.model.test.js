/**
 * CloudAudit — Unit tests for `profile.model`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the config before importing the functions that use it
jest.mock("#config");

import { pool } from "#config";
import * as profileModel from "#modules/profile/profile.model.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Profile model", () => {
  describe("getProfileById", () => {
    it("Should execute SELECT query and return the profile row", async () => {
      const userId = "test-user-id";
      const returnedRow = {
        user_id: userId,
        first_name: "Alejandro",
        last_name: "Silva",
        email: "alejandro@example.com",
        phone: "1234567890",
        country_code: "CA",
      };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await profileModel.getProfileById(userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [userId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if the user does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await profileModel.getProfileById("non-existent-id");

      expect(result).toBeNull();
    });

    it("Should catch database errors and return null", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("DB Connection Error"));

      const result = await profileModel.getProfileById("test-user-id");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("updateProfile", () => {
    it("Should dynamically build UPDATE query for multiple fields", async () => {
      const userId = "test-user-id";
      const updateData = {
        first_name: "NewName",
        phone: "0987654321",
      };
      const returnedRow = { user_id: userId, ...updateData };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await profileModel.updateProfile(userId, updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["NewName", "0987654321", userId],
      );
      expect(pool.query.mock.calls[0][0]).toContain("first_name = $1");
      expect(pool.query.mock.calls[0][0]).toContain("phone = $2");
      expect(result).toEqual(returnedRow);
    });

    it("Should dynamically build UPDATE query for a single field", async () => {
      const userId = "test-user-id";
      const returnedRow = { user_id: userId, country_code: "MX" };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await profileModel.updateProfile(userId, {
        country_code: "MX",
      });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["MX", userId],
      );
      expect(pool.query.mock.calls[0][0]).toContain("country_code = $1");
      expect(result).toEqual(returnedRow);
    });

    it("Should return null and not query the database if no fields are provided", async () => {
      const result = await profileModel.updateProfile("test-user-id", {});

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("Should handle database errors gracefully and return null", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Constraint Violation"));

      const result = await profileModel.updateProfile("test-user-id", {
        first_name: "Fail",
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("setPendingEmail", () => {
    it("Should execute UPDATE query to set pending email and token", async () => {
      const returnedRow = { id: "user-1", pending_email: "new@example.com" };
      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const expiresAt = new Date();
      const result = await profileModel.setPendingEmail(
        "user-1",
        "new@example.com",
        "token123",
        expiresAt,
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["new@example.com", "token123", expiresAt, "user-1"],
      );
      expect(result).toEqual(returnedRow);
    });
  });
});
