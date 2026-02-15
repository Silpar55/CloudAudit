import { Outlet, Link } from "react-router";

export default function PublicLayout() {
  return (
    <div>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ddd" }}>
        <Link to="/">Landing</Link> | <Link to="/login">Login</Link> |{" "}
        <Link to="/signup">Signup</Link>
      </nav>

      <Outlet />
    </div>
  );
}
