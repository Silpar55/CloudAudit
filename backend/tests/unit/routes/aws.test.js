import { jest, describe, expect, it } from "@jest/globals";

import request from "supertest";

// We are not testing auth here
jest.mock("#middleware", () => {
  const actual = jest.requireActual("#middleware");

  return {
    ...actual,
    verifyToken: jest.fn(),
  };
});

import { verifyToken } from "#middleware";
import app from "#app";

verifyToken.mockImplementation((req, res, next) => {
  req.user = { userId: 123 };
  next();
});

describe("/aws", () => {
  let endpoint = "/aws";
  describe("POST /aws/connect", () => {
    endpoint += "/connect";

    const correctBody = {
      awsAccId: "123456789012",
      awsARN: "arn:aws:iam::123456789012:policy/UsersManageOwnCredentials",
    };

    it("Should handle invalid inputs", async () => {
      const invalidAWSACCIds = ["", "abcdefghijkl", "1234"];
      const invalidARNs = [
        "aws:iam::123456789012:user/jdoe",
        "arn:aws:iam::12345678901:user/jdoe",
        "arn:aws:iam::1234567890AB:user/jdoe",
        "arn-aws-s3-mybucket",
        null,
      ];

      for (const acc of invalidAWSACCIds) {
        await request(app)
          .post(endpoint)
          .send({ ...correctBody, awsAccId: acc })
          .expect(400);
      }

      for (const arn of invalidARNs) {
        await request(app)
          .post(endpoint)
          .send({ ...correctBody, awsARN: arn })
          .expect(400);
      }
    });

    it("Should send the input into the query", async () => {
      await request(app).post(endpoint).send(correctBody).expect(200);
    });
  });
});
