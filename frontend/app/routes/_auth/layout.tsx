import { Outlet } from "react-router";
import { Navbar } from "~/components/layout";

export default function AuthLayout() {
  return (
    <>
      <Navbar showAuth={false} />
      <div className="flex items-center justify-center">
        <main className="w-full max-w-md">
          <Outlet />
        </main>
      </div>
    </>
  );
}
