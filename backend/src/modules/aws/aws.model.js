import { pool } from "#config";

export const initializePendingAccount = async ({
  accId,
  teamId,
  externalId,
  roleArn,
}) => {
  // Default status is 'role_provided' via DB definition, but we can be explicit
  const query = `
        INSERT INTO aws_accounts (aws_account_id, team_id, external_id, iam_role_arn, status)
        VALUES ($1, $2, $3, $4, 'role_provided')
        RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, [
      accId,
      teamId,
      externalId,
      roleArn,
    ]);

    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const activateAwsAccount = async (internalId) => {
  const query = `
    UPDATE aws_accounts 
    SET status = 'active', 
        connected_at = NOW(), 
        last_tested_at = NOW(),
        last_error = NULL
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [internalId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const findAwsAccountByAwsId = async (awsAccountId, teamId) => {
  const query = `
    SELECT * FROM aws_accounts
    WHERE aws_account_id = $1 AND team_id = $2;
  `;
  try {
    const { rows } = await pool.query(query, [awsAccountId, teamId]);
    return rows[0];
  } catch (error) {
    return null;
  }
};

export const findAwsAccountById = async (internalId) => {
  const query = `SELECT * FROM aws_accounts WHERE id = $1;`;
  try {
    const { rows } = await pool.query(query, [internalId]);
    return rows[0];
  } catch (error) {
    return null;
  }
};

export const updateAccountRole = async (internalId, roleArn) => {
  const query = `
    UPDATE aws_accounts 
    SET iam_role_arn = $1, status = 'role_provided'
    WHERE id = $2
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [roleArn, internalId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const deactivateAwsAccount = async (internalId) => {
  const query = `
    UPDATE aws_accounts 
    SET status = 'disconnected', disconnected_at = NOW()
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [internalId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

// ... existing getAllAccounts and addCostExploreCostAndUsageRow ...
// CRON JOB
export const getAllAccounts = async () => {
  const query = `
    SELECT * FROM aws_accounts;
  `;

  try {
    const { rows } = await pool.query(query);
    return rows;
  } catch (error) {
    return null;
  }
};

export const addCostExploreCostAndUsageRow = async (row) => {
  const allowedFields = [
    "awsAccountId",
    "timePeriodStart",
    "timePeriodEnd",
    "service",
    "region",
    "unblendedCost",
    "unblendedUnit",
    "usageQuantity",
    "usageQuantityUnit",
  ];

  // Whitelist fields
  const safeData = Object.fromEntries(
    Object.entries(row).filter(([key]) => allowedFields.includes(key)),
  );

  const keys = Object.keys(safeData);
  const values = Object.values(safeData);

  const columns = keys
    .map((k) => k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)) // camel → snake
    .join(", ");

  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", "); // $1, $2, $3, etc.

  const query = `
    INSERT INTO cost_explorer_cache (${columns})
    VALUES (${placeholders})
    RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    return null;
  }
};
