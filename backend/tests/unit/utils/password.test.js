import { hashPassword, comparePassword } from "../../../src/utils/password";
import { describe, expect } from "@jest/globals";

describe("Password functions ", () => {
  const password = "password";
  test("Verify hashPassword works as expected", async () => {
    expect((await hashPassword(password)).startsWith("$")).toBe(true); // bcrypt always start with $
  });

  test("Verify comparePassword works as expected", async () => {
    const hashed = await hashPassword(password);
    expect(await comparePassword(password, hashed)).toBe(true);
  });
});
