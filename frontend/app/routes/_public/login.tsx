/**
 * CloudAudit — Public route: `login.tsx`.
 * Unauthenticated marketing or sign-in screens; wrapped by public layout.
 */

import { Input, Button, Alert } from "~/components/ui";
import { Link } from "react-router";

import { validEmail, validPassword } from "~/utils/validation";
import React from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useLogin, useResendVerificationEmail } from "~/hooks/useAuth";
import { useAuth } from "~/context/AuthContext";
import {
  setPendingInviteToken,
  getPendingInviteToken,
} from "~/utils/pendingInviteToken";

const validateField = (name: string, value: string) => {
  switch (name) {
    case "email":
      return validEmail(value) ? "" : "Email is invalid";

    case "password":
      const result = validPassword(value);
      return result.length > 0 ? result[0].message : "";

    default:
      return "";
  }
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { mutateAsync, isPending } = useLogin();
  const { mutateAsync: resendAsync, isPending: isResending } =
    useResendVerificationEmail();
  const { login } = useAuth();

  React.useEffect(() => {
    const invite = searchParams.get("invite")?.trim();
    if (invite) setPendingInviteToken(invite);
  }, [searchParams]);

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = React.useState<any>({});
  const [alert, setAlert] = React.useState<any>({
    dismissible: true,
    title: "",
    message: "",
    visible: false,
    variant: "info",
  });

  const [showResend, setShowResend] = React.useState(false);

  const inviteFromUrl = searchParams.get("invite")?.trim();
  const signupHref = inviteFromUrl
    ? `/signup?invite=${encodeURIComponent(inviteFromUrl)}`
    : "/signup";

  const isFormValid =
    validEmail(formData.email) && validPassword(formData.password).length === 0;

  const isDisabled = !isFormValid || isPending;

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev: any) => ({ ...prev, [name]: "" }));
  };

  const handleOnDismiss = () => {
    setAlert({
      ...alert,
      visible: false,
    });
  };

  const handleBlur = (name: string, value: string) => {
    const errorMessage = validateField(name, value);

    setErrors((prev: any) => ({
      ...prev,
      [name]: errorMessage,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: any = {};

    Object.entries(formData).forEach(([key, value]) => {
      const error = validateField(key, value as string);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const data = await mutateAsync(formData);
      setAlert({
        ...alert,
        title: "Welcome back!",
        message: data.message,
        visible: true,
        variant: "success",
      });

      setShowResend(false);
      login(data.token);
      const pending = getPendingInviteToken();
      if (pending) {
        navigate(`/invite/accept?token=${encodeURIComponent(pending)}`, {
          replace: true,
        });
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || "Something went wrong";
      const status = error.response?.status;
      const unverified =
        status === 403 && /verify your email/i.test(String(msg));

      setShowResend(unverified);
      setAlert({
        title: "Error",
        message: msg,
        visible: true,
        variant: "danger",
      });
    }
  };

  return (
    <section className="mx-auto w-full max-w-7xl px-6 py-14">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-slate-700 dark:bg-slate-800">
          <p className="text-sm font-semibold uppercase tracking-wide text-aws-orange">
            Welcome back
          </p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900 dark:text-white">
            Sign in to CloudAudit
          </h1>
          <p className="mt-4 text-base text-gray-600 dark:text-gray-300">
            Continue monitoring your AWS spend, reviewing anomalies, and turning
            recommendations into measurable savings.
          </p>

          <div className="mt-8 space-y-4">
            <div className="rounded-xl bg-gray-50 p-4 dark:bg-slate-900">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                What you get after login
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>- Cost breakdown by service and time period</li>
                <li>- AI-powered anomaly detection with explanation</li>
                <li>- Optimization recommendations with estimated savings</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              New to CloudAudit?{" "}
              <Link
                to={signupHref}
                className="font-semibold text-aws-orange hover:text-aws-orange-dark"
              >
                Create your free account
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Account login
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Enter your account credentials to access your dashboard.
          </p>
          {alert.visible && (
            <Alert
              dismissible={alert.dismissible}
              onDismiss={handleOnDismiss}
              title={alert.title}
              variant={alert.variant}
              className="mb-5 mt-5"
            >
              {alert.message}
            </Alert>
          )}
          {showResend && (
            <div className="mt-3">
              <Button
                variant="outline"
                fullWidth
                disabled={isResending || !validEmail(formData.email)}
                onClick={async () => {
                  try {
                    const r = await resendAsync(formData.email);
                    setAlert({
                      title: "Verification email sent",
                      message: r?.message || "Please check your inbox.",
                      visible: true,
                      variant: "success",
                      dismissible: true,
                    });
                    setShowResend(false);
                  } catch (error: any) {
                    setAlert({
                      title: "Couldn't resend email",
                      message:
                        error.response?.data?.message || "Something went wrong",
                      visible: true,
                      variant: "danger",
                      dismissible: true,
                    });
                  }
                }}
              >
                {isResending ? "Resending..." : "Resend verification email"}
              </Button>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                If you don’t see it, check your spam folder and make sure your
                inbox can receive emails from CloudAudit.
              </p>
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <Input
              label="Email"
              placeholder="Enter your email"
              type="email"
              name="email"
              value={formData.email}
              onChange={(e: any) => handleChange("email", e.target.value)}
              onBlur={(e: any) => handleBlur("email", e.target.value)}
              error={!!errors.email}
              errorMessage={errors.email}
              required
            />
            <div>
              <Input
                label="Password"
                placeholder="Enter your password"
                type="password"
                name="password"
                value={formData.password}
                onChange={(e: any) => handleChange("password", e.target.value)}
                onBlur={(e: any) => handleBlur("password", e.target.value)}
                error={!!errors.password}
                errorMessage={errors.password}
                required
              />
              <div className="mt-1 flex justify-end">
                <a
                  href="/forgot-password"
                  className="text-sm font-semibold text-aws-orange hover:text-aws-orange-dark transition-colors"
                >
                  Forgot your password?
                </a>
              </div>
            </div>

            <Button className="mt-5" disabled={isDisabled}>
              {isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
