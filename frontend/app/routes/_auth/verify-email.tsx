import { useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { useVerifyEmail } from "~/hooks/useAuth";
import { useAuth } from "~/context/AuthContext";
import { Card, Button, Alert, Spinner } from "~/components/ui";

const REDIRECT_DELAY = 5000;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const { mutate, isPending, isSuccess, isError, error, data } =
    useVerifyEmail();
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Single verification request per token. Backend is idempotent (already-verified
   * tokens return success). Avoid sessionStorage guards — they interacted badly
   * with React Strict Mode (second mount skipped mutate while the first request
   * was discarded), leaving the UI stuck or empty.
   */
  useEffect(() => {
    if (!token) return;
    mutate(token);
  }, [token, mutate]);

  /**
   * Success flow (delay BEFORE login / redirect)
   */
  useEffect(() => {
    if (!isSuccess) return;

    const timeout = setTimeout(() => {
      if (data?.token) {
        login(data.token);
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, REDIRECT_DELAY);

    return () => clearTimeout(timeout);
  }, [isSuccess, data, login, navigate]);

  useEffect(() => {
    if (!isError) return;

    const timeout = setTimeout(() => {
      navigate("/login", { replace: true });
    }, REDIRECT_DELAY);

    return () => clearTimeout(timeout);
  }, [isError, navigate]);

  if (!token) {
    return (
      <Alert
        variant="danger"
        title="Invalid Link"
        message="No verification token was provided in the URL."
      />
    );
  }

  return (
    <Card className="p-8 text-center space-y-6 shadow-md border-0 bg-white">
      {isPending && (
        <div className="flex flex-col items-center space-y-4">
          <Spinner />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Verifying your email...
          </h2>
          <p className="text-gray-500 text-sm">
            Please wait while we confirm your token.
          </p>
        </div>
      )}

      {isSuccess && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Email Verified!
          </h2>
          <p className="text-gray-500">
            You’ll be redirected to your dashboard shortly.
          </p>
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-2">
            ✕
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Verification Failed
          </h2>
          <p className="text-gray-500 mb-6">
            {(error as any)?.response?.data?.message ||
              (error as Error)?.message ||
              "The verification link is invalid or has expired."}
          </p>

          <Link to="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
