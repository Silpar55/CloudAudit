import { pool } from "#config";

export const addAwsAccount = async ({
  awsAccId,
  teamId,
  externalId,
  roleArn,
}) => {
  const query = `
        INSERT INTO aws_accounts (aws_account_id, team_id, external_id, iam_role_arn)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;

  try {
    const { rows } = await pool.query(query, [
      awsAccId,
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

export const findAwsAccount = async ({ awsAccId, teamId }) => {
  const query = `
    SELECT * FROM aws_accounts
    WHERE aws_account_id = $1 AND team_id = $2;
  `;

  try {
    const { rows } = await pool.query(query, [awsAccId, teamId]);

    return rows[0];
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const deactivateAwsAccount = async ({ awsAccId, teamId }) => {
  const query = `
    UPDATE aws_accounts SET is_active = FALSE, disconnected_at $1
    WHERE aws_account_id = $1 AND team_id = $2
    RETURNING *;
  `;

  try {
    const { rows } = await pool.query(query, [new Date(), awsAccId, teamId]);
    return rows[0];
  } catch (error) {
    console.log(error);
    return null;
  }
};
