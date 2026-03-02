import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router";
import { Input, Button, Alert } from "~/components/ui";
import { validPassword } from "~/utils/validation";
import { useResetPassword } from "~/hooks/useAuth";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useResetPassword();

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [alert, setAlert] = useState<any>({ visible: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    const passErrors = validPassword(password);
    if (passErrors.length > 0) {
      setError(passErrors[0].message);
      return;
    }
    setError("");

    try {
      const data = await mutateAsync({ token, newPassword: password });
      setAlert({
        visible: true,
        title: "Success",
        message: data.message || "Password reset successfully.",
        variant: "success",
      });
      setTimeout(() => navigate("/login"), 3000);
    } catch (err: any) {
      setAlert({
        visible: true,
        title: "Reset Failed",
        message: err.response?.data?.message || "Invalid or expired token.",
        variant: "danger",
      });
    }
  };

  if (!token) {
    return (
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <Alert variant="danger" title="Invalid Link">
          No reset token was provided in the URL. Please request a new link.
        </Alert>
        <Link to="/forgot-password">
          <Button className="mt-6">Request New Link</Button>
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold font-display text-gray-900 dark:text-white mb-4">
          Create New Password
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Please enter your new password below.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {alert.visible && (
          <Alert variant={alert.variant} title={alert.title} className="mb-6">
            {alert.message}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="New Password"
            placeholder="Enter new password"
            type="password"
            value={password}
            onChange={(e: any) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            error={!!error}
            errorMessage={error}
            required
            disabled={isPending || alert.variant === "success"}
          />
          <Button
            className="mt-2"
            disabled={isPending || !password || alert.variant === "success"}
          >
            {isPending ? "Updating..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </section>
  );
}
