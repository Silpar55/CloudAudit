import { Navbar } from "~/components/layout";

import { Outlet } from "react-router";

export default function LandingPage() {
  const navLinks: any = [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Docs", href: "#docs" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Navbar links={navLinks} showAuth={true} />

      {/* Child routes (/, /login, /signup) render here */}
      <Outlet />
    </div>
  );
}
