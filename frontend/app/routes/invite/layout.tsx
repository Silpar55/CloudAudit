/**
 * CloudAudit — Team invitation route: `layout.tsx`.
 * Accept or preview invites via token in URL or session.
 */

import { Outlet } from "react-router";
import { Navbar } from "~/components/layout";

export default function InviteLayout() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar showAuth={true} />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
