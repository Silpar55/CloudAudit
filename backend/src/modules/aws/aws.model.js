import { pool } from "#config";

export const initializePendingAccount = async ({
  accId,
  teamId,
  externalId,
  roleArn,
}) => {
  const query = `
        INSERT INTO aws_accounts (aws_account_id, team_id, external_id, iam_role_arn, is_active)
        VALUES ($1, $2, $3, $4, FALSE)
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

export const activateAwsAccount = async (accId, teamId) => {
  const query = `
    UPDATE aws_accounts SET is_active = TRUE
    WHERE aws_account_id = $1 AND team_id = $2
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [accId, teamId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const findAwsAccount = async (accId, teamId) => {
  console.log(accId, teamId);
  const query = `
    SELECT * 
    FROM aws_accounts
    WHERE aws_account_id = $1 AND team_id = $2;
  `;

  try {
    const { rows } = await pool.query(query, [accId, teamId]);

    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const updateAccount = async (accId, teamId, roleArn) => {
  const query = `
    UPDATE aws_accounts SET iam_role_arn = $1
    WHERE aws_account_id = $2 AND team_id = $3
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [roleArn, accId, teamId]);

    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};

export const deactivateAwsAccount = async (accId, teamId) => {
  const query = `
    UPDATE aws_accounts SET is_active = FALSE, disconnected_at $1
    WHERE aws_account_id = $1 AND team_id = $2
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [new Date(), accId, teamId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};
