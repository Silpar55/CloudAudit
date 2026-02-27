import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

jest.mock("#config");
import { pool } from "#config";
import {
  initializePendingAccount,
  activateAwsAccount,
  findAwsAccountByAccId,
  findAwsAccountById,
  getAwsAccountByTeamId,
  updateAccountRole,
  deactivateAwsAccount,
  getAllAccounts,
  addCostExploreCostAndUsageRow,
  getCachedCostData,
} from "#modules/aws/aws.model.js";

describe("AWS Account Model", () => {
  const mockError = new Error("DB Error");
  let consoleLogSpy, consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("initializePendingAccount", () => {
    it("Should insert a pending AWS account and return the new row", async () => {
      const data = {
        accId: "123",
        teamId: "t1",
        externalId: "ext",
        roleArn: "arn",
      };
      pool.query.mockResolvedValue({ rows: [data] });
      const result = await initializePendingAccount(data);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO aws_accounts"),
        ["123", "t1", "ext", "arn"],
      );
      expect(result).toEqual(data);
    });

    it("Should catch database errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await initializePendingAccount({})).toBeNull();
    });
  });

  describe("findAwsAccountById", () => {
    it("Should return an account by internal ID", async () => {
      pool.query.mockResolvedValue({ rows: [{ id: "123" }] });
      const result = await findAwsAccountById("123");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT * FROM aws_accounts WHERE id = $1"),
        ["123"],
      );
      expect(result).toEqual({ id: "123" });
    });

    it("Should catch database errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await findAwsAccountById("123")).toBeNull();
    });
  });

  describe("getAwsAccountByTeamId", () => {
    it("Should return an account by team ID", async () => {
      pool.query.mockResolvedValue({ rows: [{ team_id: "t1" }] });
      const result = await getAwsAccountByTeamId("t1");
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE team_id = $1"),
        ["t1"],
      );
      expect(result).toEqual({ team_id: "t1" });
    });

    it("Should catch database errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await getAwsAccountByTeamId("t1")).toBeNull();
    });
  });

  describe("getAllAccounts", () => {
    it("Should return all accounts", async () => {
      pool.query.mockResolvedValue({ rows: [{ id: "1" }, { id: "2" }] });
      const result = await getAllAccounts();
      expect(result).toHaveLength(2);
    });

    it("Should catch errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await getAllAccounts()).toBeNull();
    });
  });

  describe("addCostExploreCostAndUsageRow", () => {
    it("Should format camelCase keys to snake_case and execute query", async () => {
      const payload = {
        awsAccountId: "acc-123",
        timePeriodStart: "2023-01-01",
        service: "AmazonEC2",
        unblendedCost: 10.5,
      };
      pool.query.mockResolvedValue({ rows: [payload] });

      const result = await addCostExploreCostAndUsageRow(payload);

      // Ensures the snake casing transformation happened correctly
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          "aws_account_id, time_period_start, service, unblended_cost",
        ),
        ["acc-123", "2023-01-01", "AmazonEC2", 10.5],
      );
      expect(result).toEqual(payload);
    });

    it("Should catch errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await addCostExploreCostAndUsageRow({})).toBeNull();
    });
  });

  describe("getCachedCostData", () => {
    it("Should return rows between dates", async () => {
      pool.query.mockResolvedValue({ rows: [{ cost: 100 }] });
      const result = await getCachedCostData(
        "acc-123",
        "2023-01-01",
        "2023-01-31",
      );
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("cost_explorer_cache"),
        ["acc-123", "2023-01-01", "2023-01-31"],
      );
      expect(result).toEqual([{ cost: 100 }]);
    });

    it("Should catch errors and return null", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await getCachedCostData("1", "2023", "2023")).toBeNull();
    });
  });

  // Covering remaining try/catch blocks for basic endpoints
  describe("Other Modifiers (activate, update, deactivate)", () => {
    it("Should catch errors on activateAwsAccount", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await activateAwsAccount("123")).toBeNull();
    });

    it("Should catch errors on updateAccountRole", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await updateAccountRole("123", "arn")).toBeNull();
    });

    it("Should catch errors on deactivateAwsAccount", async () => {
      pool.query.mockRejectedValue(mockError);
      expect(await deactivateAwsAccount("123")).toBeNull();
    });
  });
});
