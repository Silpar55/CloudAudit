/**
 * CloudAudit — Unit tests for `aws.middleware`.
 * Run from `backend/` with `npm test`.
 */

import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/aws/aws.model.js");

import * as awsModel from "#modules/aws/aws.model.js";
import { verifyAwsAccId } from "#middleware";

describe("verifyAwsAccId Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {
        teamId: "team-123",
        internalAccountId: "acc-456", // Internal UUID
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("Should call next() and attach awsAccount if the account exists and matches team", async () => {
    const mockAccount = {
      id: "acc-456",
      team_id: "team-123",
      is_active: true,
    };
    awsModel.findAwsAccountByInternalId.mockResolvedValue(mockAccount);

    await verifyAwsAccId(req, res, next);

    expect(awsModel.findAwsAccountByInternalId).toHaveBeenCalledWith("acc-456");
    expect(req.awsAccount).toEqual(mockAccount); // Ensure it was attached
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("Should return 404 if the AWS account does not exist", async () => {
    awsModel.findAwsAccountByInternalId.mockResolvedValue(null);

    await verifyAwsAccId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Account not found or access denied",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("Should return 404 if the AWS account belongs to a different team", async () => {
    const mockAccount = {
      id: "acc-456",
      team_id: "wrong-team", // Mismatch!
    };
    awsModel.findAwsAccountByInternalId.mockResolvedValue(mockAccount);

    await verifyAwsAccId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
