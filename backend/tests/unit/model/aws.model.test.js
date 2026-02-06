import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock the config before importing the functions that use it
jest.mock("#config");

import { pool } from "#config";
import {
  initializePendingAccount,
  activateAwsAccount,
  findAwsAccount,
  updateAccount,
  deactivateAwsAccount,
} from "#modules/aws/aws.model.js";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AWS Account Model", () => {
  describe("initializePendingAccount", () => {
    it("Should insert a pending AWS account and return the new row", async () => {
      const accountData = {
        accId: "123456789012",
        teamId: "team-1",
        externalId: "ext-id-123",
        roleArn: "arn:aws:iam::123456789012:role/MyRole",
      };
      const returnedRow = {
        aws_account_id: accountData.accId,
        team_id: accountData.teamId,
        external_id: accountData.externalId,
        iam_role_arn: accountData.roleArn,
        is_active: false,
      };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await initializePendingAccount(accountData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO aws_accounts"),
        [
          accountData.accId,
          accountData.teamId,
          accountData.externalId,
          accountData.roleArn,
        ],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if the query fails", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("DB Error"));

      const accountData = {
        accId: "123456789012",
        teamId: "team-1",
        externalId: "ext-id-123",
        roleArn: "arn:aws:iam::123456789012:role/MyRole",
      };

      const result = await initializePendingAccount(accountData);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("activateAwsAccount", () => {
    it("Should activate an AWS account and return the updated row", async () => {
      const accId = "123456789012";
      const teamId = "team-1";
      const returnedRow = {
        aws_account_id: accId,
        team_id: teamId,
        is_active: true,
      };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await activateAwsAccount(accId, teamId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE aws_accounts SET is_active = TRUE"),
        [accId, teamId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if activation fails", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Update failed"));

      const result = await activateAwsAccount("123456789012", "team-1");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it("Should return undefined if account does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await activateAwsAccount("999999999999", "team-999");

      expect(result).toBeUndefined();
    });
  });

  describe("findAwsAccount", () => {
    it("Should return an AWS account if it exists", async () => {
      const accId = "123456789012";
      const teamId = "team-1";
      const returnedRow = {
        aws_account_id: accId,
        team_id: teamId,
        external_id: "ext-id",
        iam_role_arn: "arn:aws:iam::123456789012:role/MyRole",
        is_active: true,
      };

      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await findAwsAccount(accId, teamId);

      expect(consoleLogSpy).toHaveBeenCalledWith(accId, teamId);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT *"),
        [accId, teamId],
      );
      expect(result).toEqual(returnedRow);
      consoleLogSpy.mockRestore();
    });

    it("Should return undefined if account does not exist", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      pool.query.mockResolvedValue({ rows: [] });

      const result = await findAwsAccount("999999999999", "team-999");

      expect(result).toBeUndefined();
      consoleLogSpy.mockRestore();
    });

    it("Should return null if the query fails", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Query failed"));

      const result = await findAwsAccount("123456789012", "team-1");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("updateAccount", () => {
    it("Should update the IAM role ARN and return the updated row", async () => {
      const accId = "123456789012";
      const teamId = "team-1";
      const roleArn = "arn:aws:iam::123456789012:role/NewRole";
      const returnedRow = {
        aws_account_id: accId,
        team_id: teamId,
        iam_role_arn: roleArn,
      };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await updateAccount(accId, teamId, roleArn);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE aws_accounts SET iam_role_arn"),
        [roleArn, accId, teamId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if update fails", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Update failed"));

      const result = await updateAccount(
        "123456789012",
        "team-1",
        "arn:aws:iam::123456789012:role/NewRole",
      );

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it("Should return undefined if account does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await updateAccount(
        "999999999999",
        "team-999",
        "arn:aws:iam::999999999999:role/Role",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("deactivateAwsAccount", () => {
    it("Should deactivate an AWS account and return the updated row", async () => {
      const accId = "123456789012";
      const teamId = "team-1";
      const returnedRow = {
        aws_account_id: accId,
        team_id: teamId,
        is_active: false,
        disconnected_at: expect.any(Date),
      };

      pool.query.mockResolvedValue({ rows: [returnedRow] });

      const result = await deactivateAwsAccount(accId, teamId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE aws_accounts SET is_active = FALSE"),
        [expect.any(Date), accId, teamId],
      );
      expect(result).toEqual(returnedRow);
    });

    it("Should return null if deactivation fails", async () => {
      const consoleLogSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      pool.query.mockRejectedValue(new Error("Deactivation failed"));

      const result = await deactivateAwsAccount("123456789012", "team-1");

      expect(result).toBeNull();
      expect(consoleLogSpy).toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    it("Should return undefined if account does not exist", async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await deactivateAwsAccount("999999999999", "team-999");

      expect(result).toBeUndefined();
    });
  });
});
