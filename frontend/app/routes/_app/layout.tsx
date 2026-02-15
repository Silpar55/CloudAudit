import { Outlet, Link, Navigate } from "react-router";

export default function AppLayout() {
  const isAuthenticated = true; // 🔥 Replace with real auth later

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ddd" }}>
        <Link to="/dashboard">Dashboard</Link> |{" "}
        <Link to="/profile">Profile</Link>
      </nav>

      <Outlet />
    </div>
  );
}
