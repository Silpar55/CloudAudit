/**
 * CloudAudit — Auth flow route: `layout.tsx`.
 * Email verification and similar post-registration steps.
 */

import { Navigate, Outlet } from "react-router";
import { Navbar } from "~/components/layout";
import { useAuth } from "~/context/AuthContext";

export default function AuthLayout() {
  return (
    <>
      <Navbar showAuth={false} />
      <div className="min-h-screen flex items-center justify-center">
        <main className="w-full max-w-md">
          <Outlet />
        </main>
      </div>
    </>
  );
}
