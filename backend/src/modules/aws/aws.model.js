import { pool } from "#config";

export const initializePendingAccount = async ({
  accId,
  teamId,
  externalId,
  roleArn,
}) => {
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

export const activateAwsAccount = async (internalId, awsAccId, roleArn) => {
  const query = `
    UPDATE aws_accounts 
    SET status = 'active', 
        aws_account_id = $2,
        iam_role_arn = $3,
        connected_at = NOW(), 
        last_tested_at = NOW(),
        last_error = NULL
    WHERE id = $1
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [internalId, awsAccId, roleArn]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const findAwsAccountByAccId = async (awsAccountId, teamId) => {
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

/**
 * Get the AWS account record for a team.
 * Used by the frontend to retrieve the internal UUID after the team goes active.
 */
export const getAwsAccountByTeamId = async (teamId) => {
  const query = `
    SELECT * FROM aws_accounts
    WHERE team_id = $1
    LIMIT 1;
  `;
  try {
    const { rows } = await pool.query(query, [teamId]);
    return rows[0] ?? null;
  } catch (error) {
    console.error(error);
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

// CRON JOB
export const getAllAccounts = async () => {
  const query = `SELECT * FROM aws_accounts;`;

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

  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

  const query = `
    INSERT INTO cost_explorer_cache (${columns})
    VALUES (${placeholders})
    ON CONFLICT (aws_account_id, time_period_start, service, region)
    DO UPDATE SET
      unblended_cost = EXCLUDED.unblended_cost,
      unblended_unit = EXCLUDED.unblended_unit,
      usage_quantity = EXCLUDED.usage_quantity,
      usage_quantity_unit = EXCLUDED.usage_quantity_unit,
      retrieved_at = NOW(),
      is_stale = FALSE
    RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

/**
 * Read cached Cost Explorer rows for a given account + date window.
 * Called by the /cached endpoint — no AWS API call involved.
 *
 * @param {string} internalId  - aws_accounts.id (internal UUID)
 * @param {string} startDate   - YYYY-MM-DD inclusive
 * @param {string} endDate     - YYYY-MM-DD inclusive
 * @returns {Promise<Array>}
 */
export const getCachedCostData = async (internalId, startDate, endDate) => {
  const query = `
    SELECT *
    FROM cost_explorer_cache
    WHERE aws_account_id = $1
      AND time_period_start >= $2::date
      AND time_period_end   <= $3::date
    ORDER BY time_period_start ASC, unblended_cost DESC;
  `;

  try {
    const { rows } = await pool.query(query, [internalId, startDate, endDate]);
    return rows;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateCurStatus = async (internalId, status) => {
  const query = `UPDATE aws_accounts SET cur_status = $1 WHERE id = $2 RETURNING cur_status;`;
  const { rows } = await pool.query(query, [status, internalId]);
  return rows[0];
};
