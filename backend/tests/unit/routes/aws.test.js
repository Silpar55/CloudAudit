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
    verifyToken: jest.fn(),
  };
});

import { verifyToken } from "#middleware";
import { validateUserRole, validRoleARN } from "#utils";
import { addAwsAccount } from "#modules/aws/aws.model.js";

import app from "#app";

verifyToken.mockImplementation((req, res, next) => {
  req.user = { userId: 123 };
  next();
});

describe("/aws", () => {
  let endpoint = "/aws";
  describe("POST /aws/connect", () => {
    endpoint += "/connect/team-id";
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

    it("Should send the input into the query", async () => {
      validateUserRole.mockImplementation(() => {
        return validRoleARN(
          "arn:aws:iam::123456789012:role/ExternalServiceExecutionRole",
        );
      });

      addAwsAccount.mockResolvedValue(true);

      await request(app)
        .post(endpoint)
        .send({
          roleArn:
            "arn:aws:iam::123456789012:role/ExternalServiceExecutionRole",
        })
        .expect(200);
    });
  });
});
