import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#config");

import { pool } from "#config";
import {
  createUser,
  findUser,
  findUserById,
  getUserByVerificationToken,
  verifyEmailAndClearToken,
} from "#modules/auth/auth.model.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("User model", () => {
  describe("createUser", () => {
    it("Should insert a user and return new user", async () => {
      const fakeUser = {
        firstName: "Alejandro",
        lastName: "Silva",
        email: "alesj501@gmail.com",
        phone: "4375994791",
        countryCode: "CA",
        password: "CloudAudit11!",
      };
      const returnedRow = { id: 1, ...fakeUser };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await createUser(fakeUser);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.any(Array),
      );
      expect(result).toBe(returnedRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await createUser({ email: "test@example.com" });
      expect(result).toBeNull();
    });
  });

  describe("findUser", () => {
    it("Should return a user by email", async () => {
      const fakeRow = { id: 1, email: "test@example.com" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await findUser("test@example.com");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT *"),
        ["test@example.com"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return undefined if user not found", async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await findUser("test@example.com");
      expect(result).toBeUndefined();
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await findUser("error@example.com");
      expect(result).toBeNull();
    });
  });

  describe("findUserById", () => {
    it("Should return a user by user_id", async () => {
      const fakeRow = { user_id: 1, email: "test@example.com" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await findUserById(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = $1"),
        [1],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await findUserById(1);
      expect(result).toBeNull();
    });
  });

  describe("getUserByVerificationToken", () => {
    it("Should return a user matching the verification token", async () => {
      const fakeRow = { user_id: 1, verification_token: "xyz123" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await getUserByVerificationToken("xyz123");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE verification_token = $1"),
        ["xyz123"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return undefined if token is not found", async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const result = await getUserByVerificationToken("non-existent-token");
      expect(result).toBeUndefined();
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await getUserByVerificationToken("xyz123");
      expect(result).toBeNull();
    });
  });

  describe("verifyEmailAndClearToken", () => {
    it("Should update user email_verified status and return updated user", async () => {
      const fakeRow = {
        user_id: 1,
        email: "verified@test.com",
        email_verified: true,
      };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await verifyEmailAndClearToken(1, "verified@test.com");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users"),
        ["verified@test.com", 1],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if query fails", async () => {
      pool.query.mockRejectedValue(new Error("DB error"));
      const result = await verifyEmailAndClearToken(1, "test@test.com");
      expect(result).toBeNull();
    });
  });
});
