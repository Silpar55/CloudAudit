import { Navbar } from "~/components/layout";

import { Navigate, Outlet } from "react-router";
import { useAuth } from "~/context/AuthContext";

export default function LandingPage() {
  const navLinks: any = [
    // { label: "Features", href: "#features" },
    // { label: "Pricing", href: "#pricing" },
    // { label: "Docs", href: "#docs" },
  ];

  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Or a spinner
  }

  // If user is already logged in, kick them to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar links={navLinks} showAuth={true} />
      <Outlet />
    </div>
  );
}
