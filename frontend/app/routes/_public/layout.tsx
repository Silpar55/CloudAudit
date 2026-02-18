import { Navigate, Outlet, useNavigate } from "react-router";
import { Navbar } from "~/components/layout";
import { useAuth } from "~/context/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  // const navLinks: any = [
  //   { label: "Features", href: "#features" },
  //   { label: "Pricing", href: "#pricing" },
  //   { label: "Docs", href: "#docs" },
  // ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar links={[]} showAuth={true} />
      <Outlet />
    </div>
  );
}
