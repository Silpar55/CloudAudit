/**
 * CloudAudit — Unit tests for `health.route`.
 * Run from `backend/` with `npm test`.
 */

import { expect } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("#config");
beforeEach(() => {
  jest.clearAllMocks();
});

import { pool } from "#config";
import app from "#app";

// Health /auth uses jwt.verify(..., process.env.JWT_SECRET), not SECRETKEY
process.env.JWT_SECRET = "test-secret";

describe("GET /health/", () => {
  const endpoint = "/api/health";
  it("Should show the server is up", async () => {
    const response = await request(app).get(endpoint + "/server");
    const jsonResponse = JSON.parse(response.text);
    const { message, server } = jsonResponse;

    expect(message).toBe("OK");
    expect(server).toBe("up");
  });

  it("Should show the database is healthy", async () => {
    const response = await request(app).get(endpoint + "/database");
    const jsonResponse = JSON.parse(response.text);
    const { message, database } = jsonResponse;

    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(message).toBe("OK");
    expect(database).toBe("healthy");
  });

  it("Should throw error when user does not has a token", async () => {
    const response = await request(app).get(endpoint + "/auth");
    const jsonResponse = JSON.parse(response.text);
    const { message, token } = jsonResponse;
    expect(message).toBe("Missing or invalid Authorization header");
    expect(token).toBe("invalid");
  });

  it("Should throw error when user does not has a valid token", async () => {
    const response = await request(app)
      .get(endpoint + "/auth")
      .set("Authorization", "Bearer TOKEN");
    const jsonResponse = JSON.parse(response.text);
    const { message, token } = jsonResponse;
    expect(message).toBe("Invalid or expire token");
    expect(token).toBe("invalid");
  });

  it("Should show the token is valid", async () => {
    const mockToken = jwt.sign({ mock: "Example" }, process.env.JWT_SECRET, {
      expiresIn: "10s",
    });

    const response = await request(app)
      .get(endpoint + "/auth")
      .set("Authorization", `Bearer ${mockToken}`);
    const jsonResponse = JSON.parse(response.text);
    const { message, token } = jsonResponse;
    expect(message).toBe("OK");
    expect(token).toBe("valid");
  });
});
