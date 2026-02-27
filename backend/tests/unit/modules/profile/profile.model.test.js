import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the config before importing the functions that use it
jest.mock("#config");

import { pool } from "#config";
import {
  getProfileById,
  updateProfile,
} from "#modules/profile/profile.model.js";

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

      const result = await getProfileById(userId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT"),
        [userId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if the user does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await getProfileById("non-existent-id");

      expect(result).toBeNull();
    });

    it("Should catch database errors and return null", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("DB Connection Error"));

      const result = await getProfileById("test-user-id");

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

      const result = await updateProfile(userId, updateData);

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

      const result = await updateProfile(userId, { country_code: "MX" });

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["MX", userId],
      );
      expect(pool.query.mock.calls[0][0]).toContain("country_code = $1");
      expect(result).toEqual(returnedRow);
    });

    it("Should return null and not query the database if no fields are provided", async () => {
      const result = await updateProfile("test-user-id", {});

      expect(pool.query).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("Should handle database errors gracefully and return null", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Constraint Violation"));

      const result = await updateProfile("test-user-id", {
        first_name: "Fail",
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
