import React, { useState } from "react";
import { Link } from "react-router";
import { Input, Button, Alert } from "~/components/ui";
import { validEmail } from "~/utils/validation";
import { useRequestPasswordReset } from "~/hooks/useAuth";

export default function ForgotPassword() {
  const { mutateAsync, isPending, isSuccess } = useRequestPasswordReset();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [alert, setAlert] = useState<any>({ visible: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");

    try {
      const data = await mutateAsync(email);
      setAlert({
        visible: true,
        title: "Check your inbox",
        message:
          data.message ||
          "If that email is registered, you will receive a reset link shortly.",
        variant: "success",
      });
    } catch (err: any) {
      setAlert({
        visible: true,
        title: "Error",
        message: err.response?.data?.message || "Something went wrong.",
        variant: "danger",
      });
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-20">
      <div className="max-w-xl mx-auto text-center mb-8">
        <h1 className="text-4xl font-bold font-display text-gray-900 dark:text-white mb-4">
          Reset your password
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter the email address associated with your account and we'll send
          you a link to reset your password.
        </p>
      </div>

      <div className="max-w-md mx-auto">
        {alert.visible && (
          <Alert variant={alert.variant} title={alert.title} className="mb-6">
            {alert.message}
          </Alert>
        )}

        {!isSuccess && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              placeholder="Enter your email"
              type="email"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
              error={!!error}
              errorMessage={error}
              required
              disabled={isPending}
            />
            <Button className="mt-2" disabled={isPending || !email}>
              {isPending ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-aws-orange transition-colors"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </section>
  );
}
