import { Outlet, Link, useParams } from "react-router";

export default function TeamLayout() {
  const { teamId } = useParams();

  return (
    <div style={{ display: "flex" }}>
      <aside
        style={{
          width: "220px",
          padding: "1rem",
          borderRight: "1px solid #ddd",
        }}
      >
        <h3>Team {teamId}</h3>

        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <Link to={`/teams/${teamId}`}>Overview</Link>
          </li>
          <li>
            <Link to={`/teams/${teamId}/members`}>Members</Link>
          </li>
          <li>
            <Link to={`/teams/${teamId}/audit-logs`}>Audit Logs</Link>
          </li>
          <li>
            <Link to={`/teams/${teamId}/recommendations`}>Recommendations</Link>
          </li>
          <li>
            <Link to={`/teams/${teamId}/anomalies`}>Anomalies</Link>
          </li>
          <li>
            <Link to={`/teams/${teamId}/aws`}>AWS</Link>
          </li>
          <li>
            <Link to={`/teams/${teamId}/settings`}>Settings</Link>
          </li>
        </ul>
      </aside>

      <main style={{ padding: "2rem", flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}
