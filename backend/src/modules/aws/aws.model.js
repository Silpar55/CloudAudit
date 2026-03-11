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

/**
 * High-performance batch insert for granular CUR data
 * Maps exactly to the cost_data table and automatically fires
 * the trg_update_daily_cost trigger to build summaries.
 */
export const batchInsertCurData = async (internalAccId, parsedRows) => {
  if (!parsedRows || parsedRows.length === 0) return 0;

  // Map the objects to flat arrays for PG UNNEST
  const timeIntervals = parsedRows.map((r) => r.time_interval);
  const productCodes = parsedRows.map((r) => r.product_code);
  const usageTypes = parsedRows.map((r) => r.usage_type);
  const operations = parsedRows.map((r) => r.operation);
  const resourceIds = parsedRows.map((r) => r.resource_id);
  const usageAmounts = parsedRows.map((r) => r.usage_amount);
  const unblendedCosts = parsedRows.map((r) => r.unblended_cost);
  const regions = parsedRows.map((r) => r.region);
  const blendedCosts = parsedRows.map((r) => r.blended_cost);
  const amortizedCosts = parsedRows.map((r) => r.amortized_cost);
  const billPeriods = parsedRows.map((r) => r.bill_period);

  // Note: We leave out tag_* columns and instance_type for now as they can be null,
  // but we enforce the NOT NULL requirements of your schema.
  const query = `
    INSERT INTO cost_data (
      aws_account_id, time_interval, product_code, usage_type, 
      operation, resource_id, usage_amount, unblended_cost, 
      region, blended_cost, amortized_cost, bill_period
    )
    SELECT $1, * FROM UNNEST (
      $2::timestamp[], $3::text[], $4::text[], 
      $5::text[], $6::text[], $7::numeric[], 
      $8::numeric[], $9::text[], $10::numeric[], 
      $11::numeric[], $12::date[]
    )
  `;

  try {
    const { rowCount } = await pool.query(query, [
      internalAccId,
      timeIntervals,
      productCodes,
      usageTypes,
      operations,
      resourceIds,
      usageAmounts,
      unblendedCosts,
      regions,
      blendedCosts,
      amortizedCosts,
      billPeriods,
    ]);
    return rowCount;
  } catch (error) {
    console.error("Batch insert failed:", error);
    throw error;
  }
};

/**
 * Gets the most recent timestamp of when CUR data was inserted for this account.
 */
export const getLastCurSyncTime = async (internalId) => {
  const query = `SELECT MAX(loaded_at) as last_sync FROM cost_data WHERE aws_account_id = $1`;
  try {
    const { rows } = await pool.query(query, [internalId]);
    return rows[0]?.last_sync || null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
