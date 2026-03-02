import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#config");

import { pool } from "#config";
import {
  deactivateUser,
  deactivateUserTeamMemberships,
  updateUserPassword,
  setPasswordResetToken,
  resetPasswordAndClearToken,
} from "#modules/auth/auth.model.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("User model — new features", () => {
  describe("deactivateUser", () => {
    it("Should set is_active to false and return the updated user", async () => {
      const fakeRow = {
        user_id: "1",
        is_active: false,
        deactivated_at: new Date(),
      };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await deactivateUser("1");

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["1"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await deactivateUser("1");
      expect(result).toBeNull();
    });
  });

  describe("deactivateUserTeamMemberships", () => {
    it("Should set is_active to false on all team_members rows for the user", async () => {
      const fakeRows = [
        { team_member_id: "a", user_id: "1", is_active: false },
        { team_member_id: "b", user_id: "1", is_active: false },
      ];
      pool.query.mockResolvedValue({ rows: fakeRows });

      const result = await deactivateUserTeamMemberships("1");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE team_members"),
        ["1"],
      );
      expect(result).toEqual(fakeRows);
    });

    it("Should return an empty array if the user has no memberships", async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await deactivateUserTeamMemberships("1");
      expect(result).toEqual([]);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await deactivateUserTeamMemberships("1");
      expect(result).toBeNull();
    });
  });

  describe("updateUserPassword", () => {
    it("Should update password and return user_id and email", async () => {
      const fakeRow = { user_id: "1", email: "test@test.com" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await updateUserPassword("1", "hashed-pw");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["hashed-pw", "1"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await updateUserPassword("1", "hashed-pw");
      expect(result).toBeNull();
    });
  });

  describe("setPasswordResetToken", () => {
    it("Should store the reset token and expiry and return user_id and email", async () => {
      const expiresAt = new Date(Date.now() + 3600000);
      const fakeRow = { user_id: "1", email: "test@test.com" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await setPasswordResetToken(
        "1",
        "reset-token-hex",
        expiresAt,
      );

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["reset-token-hex", expiresAt, "1"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await setPasswordResetToken("1", "token", new Date());
      expect(result).toBeNull();
    });
  });

  describe("resetPasswordAndClearToken", () => {
    it("Should update password, clear token fields, and return the user", async () => {
      const fakeRow = { user_id: "1", email: "test@test.com" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await resetPasswordAndClearToken("1", "new-hashed-pw");

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["new-hashed-pw", "1"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await resetPasswordAndClearToken("1", "pw");
      expect(result).toBeNull();
    });
  });
});
