import { describe, expect, it, jest } from "@jest/globals";

jest.mock("#config");

beforeEach(() => {
  jest.clearAllMocks();
});

import { pool } from "#config";
import { createUser, findUser } from "#models";

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
      const fakeUser = { email: "test@example.com" };

      pool.query.mockRejectedValue(new Error("DB error"));

      const result = await createUser(fakeUser);

      expect(result).toBe(null);
    });
  });

  describe("findUser", () => {
    it("Should return a user by email", async () => {
      const fakeRow = { id: 1, email: "test@example.com" };
      pool.query.mockResolvedValue({ rows: [fakeRow] });

      const result = await findUser("test@example.com");
      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(`
    SELECT *
    FROM users
    `),
        ["test@example.com"],
      );
      expect(result).toEqual(fakeRow);
    });

    it("Should return null if user not found", async () => {
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
});
