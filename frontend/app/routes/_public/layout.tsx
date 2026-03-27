import { Navigate, Outlet } from "react-router";
import { Navbar, PublicFooter } from "~/components/layout";
import { useAuth } from "~/context/AuthContext";

export default function publicAppLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar links={[]} showAuth={true} />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
