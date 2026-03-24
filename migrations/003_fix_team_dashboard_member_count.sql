-- Fix inflated member_count: COUNT(tm.*) was multiplied by daily_cost_summaries rows.
-- Use a scalar subquery so members are counted once per team.

DROP VIEW IF EXISTS team_dashboard_view;

CREATE VIEW team_dashboard_view AS
SELECT
    t.team_id,
    t.name,
    t.description,
    t.status,
    (
        SELECT COUNT(*)::int
        FROM team_members tm2
        WHERE tm2.team_id = t.team_id
          AND tm2.is_active = TRUE
    ) AS member_count,
    a.aws_account_id,
    a.status AS aws_status,
    COALESCE(SUM(dcs.total_cost), 0) AS monthly_cost
FROM teams t
LEFT JOIN aws_accounts a ON a.team_id = t.team_id
LEFT JOIN daily_cost_summaries dcs
    ON dcs.aws_account_id = a.id
    AND date_trunc('month', dcs.time_period_start) = date_trunc('month', NOW()::timestamp)
GROUP BY t.team_id, t.name, t.description, t.status, a.aws_account_id, a.status;
