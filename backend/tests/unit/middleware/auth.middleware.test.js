import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#utils", () => {
  const actual = jest.requireActual("#utils");

  return {
    ...actual,
    verifyJwtHelper: jest.fn(),
  };
});

import { verifyToken } from "#middleware";
import { verifyJwtHelper } from "#utils";

describe("verifyToken Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("Should call next() when verifyJwtHelper returns a valid user", () => {
    req.headers.authorization = "Bearer valid-token";

    verifyJwtHelper.mockImplementation((token) => {
      if (token === "valid-token") {
        return { userId: "user_123" };
      }
    });

    verifyToken(req, res, next);

    expect(verifyJwtHelper).toHaveBeenCalledWith("valid-token");
    expect(req.userId).toBe("user_123");
    expect(next).toHaveBeenCalled();
  });

  it("Should return 500 when verifyJwtHelper throws an error", () => {
    req.headers.authorization = "Bearer bad-token";

    verifyJwtHelper.mockImplementation(() => {
      throw new Error("Expired or Invalid");
    });

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid or expire token" }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("Should return 401 when Authorization header is missing", () => {
    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
