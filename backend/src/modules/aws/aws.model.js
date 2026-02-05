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
