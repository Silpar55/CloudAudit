import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("#modules/aws/aws.model.js", () => ({
  findAwsAccount: jest.fn(),
}));

import { findAwsAccount } from "#modules/aws/aws.model.js";
import { verifyAwsAccId } from "#middleware";

describe("verifyAwsAccId Middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      params: {
        teamId: "team-123",
        accId: "aws-acc-456",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();

    jest.clearAllMocks();
  });

  it("Should call next() if the AWS account exists", async () => {
    const mockAccount = {
      aws_account_id: "aws-acc-456",
      team_id: "team-123",
      is_active: true,
    };
    findAwsAccount.mockResolvedValue(mockAccount);

    await verifyAwsAccId(req, res, next);

    expect(findAwsAccount).toHaveBeenCalledWith("aws-acc-456", "team-123");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("Should return 404 if the AWS account does not exist", async () => {
    findAwsAccount.mockResolvedValue(null);

    await verifyAwsAccId(req, res, next);

    expect(findAwsAccount).toHaveBeenCalledWith("aws-acc-456", "team-123");
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Account id does not exists",
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("Should return 404 if findAwsAccount returns undefined", async () => {
    findAwsAccount.mockResolvedValue(undefined);

    await verifyAwsAccId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });
});
