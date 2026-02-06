import { jest, describe, expect, it } from "@jest/globals";

import request from "supertest";

jest.mock("#utils", () => {
  const actual = jest.requireActual("#utils");

  return {
    ...actual,
    validateUserRole: jest.fn(),
  };
});

jest.mock("#modules/aws/aws.model.js");

// We are not testing auth here
jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");

  return {
    ...actual,
    verifyToken: jest.fn((req, res, next) => next()),
    verifyTeamId: jest.fn((req, res, next) => next()),
    verifyAwsAccId: jest.fn((req, res, next) => next()),
  };
});

import { randomUUID } from "crypto";
import { verifyToken } from "#middleware";
import { validateUserRole, validRoleARN } from "#utils";
import {
  findAwsAccount,
  initializePendingAccount,
  activateAwsAccount,
  deactivateAwsAccount,
} from "#modules/aws/aws.model.js";

import app from "#app";

verifyToken.mockImplementation((req, res, next) => {
  req.user = { userId: 123 };
  next();
});

describe("/api/teams/:teamId/aws-accounts", () => {
  const roleArn = "arn:aws:iam::123456789012:role/ExternalServiceExecutionRole";
  describe("POST /provision", () => {
    const endpoint = "/api/teams/TEAM-ID/aws-accounts/provision";

    it("Should handle invalid inputs", async () => {
      const invalidARNs = [
        "aws:iam::abcdefghijkl:user/jdoe",
        "arn:aws:iam::12345678901:user/jdoe",
        "arn:aws:iam::1234567890AB:user/jdoe",
        "arn-aws-s3-mybucket",
        null,
      ];

      for (const arn of invalidARNs) {
        await request(app).post(endpoint).send({ roleArn: arn }).expect(400);
      }
    });

    it("Should store the pending account into the DB", async () => {
      findAwsAccount.mockResolvedValue(null);

      initializePendingAccount.mockResolvedValue({
        roleArn,
        externalId: randomUUID(),
        awsAccId: "123456789012",
        teamId: "TEAM-ID",
      });

      await request(app)
        .post(endpoint)
        .send({
          roleArn,
        })
        .expect(200);
    });
  });

  describe("POST /activate", () => {
    const endpoint = "/api/teams/TEAM-ID/aws-accounts/activate";

    it("Should handle invalid inputs", async () => {
      const invalidARNs = [
        "aws:iam::abcdefghijkl:user/jdoe",
        "arn:aws:iam::12345678901:user/jdoe",
        "arn:aws:iam::1234567890AB:user/jdoe",
        "arn-aws-s3-mybucket",
        null,
      ];

      for (const arn of invalidARNs) {
        await request(app).post(endpoint).send({ roleArn: arn }).expect(400);
      }
    });

    it("Should verify aws connection and active account", async () => {
      validateUserRole.mockImplementation(() => {
        return validRoleARN(roleArn);
      });

      activateAwsAccount.mockResolvedValue(true);

      findAwsAccount.mockResolvedValue({
        iam_role_arn: roleArn,
        external_id: randomUUID(),
        aws_account_id: "123456789012",
        teamId: "TEAM-ID",
      });

      await request(app).post(endpoint).send({ roleArn }).expect(200);
    });
  });

  // describe("GET /", () => {});

  describe("DELETE /:accId", () => {
    const endpoint = "/api/teams/TEAM-ID/aws-accounts";
    it("Should deactivate account", async () => {
      const accId = "123456789012";
      deactivateAwsAccount.mockResolvedValue({
        aws_account_id: accId,
      });

      await request(app)
        .delete(endpoint + `/${accId}`)
        .expect(200);
    });
  });
});
