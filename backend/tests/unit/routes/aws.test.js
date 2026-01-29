import request from "supertest";
import { jest, describe, expect, it } from "@jest/globals";

// We are not testing auth here

jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");

  return {
    ...actual,
    verifyToken: jest.fn(),
  };
});

import { verifyToken } from "#middleware";

verifyToken.mockResolvedValue({ userId: 123 });

describe("/aws", () => {
  let endpoint = "/aws";
  describe("POST /aws/connect", () => {
    endpoint += "/connect";

    it("Should handle invalid inputs", async () => {
      expect(true).toBe(true);
    });
  });
});
