import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../src/server.js";

describe("GET /healthcheck/", () => {
  const endpoint = "/healthcheck";
  test("Should show the server is up", async () => {
    const response = await request(app).get(endpoint);
    const jsonResponse = JSON.parse(response.text);
    const { message, server } = jsonResponse;

    expect(message).toBe("OK");
    expect(server).toBe("up");
  });

  test("Should show the database is healthy", async () => {
    const response = await request(app).get(endpoint + "/database");
    const jsonResponse = JSON.parse(response.text);
    const { message, database } = jsonResponse;

    expect(message).toBe("OK");
    expect(database).toBe("healthy");
  });

  test("Should throw error when user does not has a token", async () => {
    const response = await request(app).get(endpoint + "/auth");
    const jsonResponse = JSON.parse(response.text);
    const { message, token } = jsonResponse;
    expect(message).toBe("Missing or invalid Authorization header");
    expect(token).toBe("invalid");
  });

  test("Should throw error when user does not has a valid token", async () => {
    const response = await request(app)
      .get(endpoint + "/auth")
      .set("Authorization", "Bearer TOKEN");
    const jsonResponse = JSON.parse(response.text);
    const { message, token } = jsonResponse;
    expect(message).toBe("Invalid or expire token");
    expect(token).toBe("invalid");
  });

  test("Should show the token is valid", async () => {
    const mockToken = jwt.sign({ mock: "Example" }, process.env.SECRETKEY, {
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
