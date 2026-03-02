import { useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router";
import { useVerifyEmail } from "~/hooks/useAuth";
import { useAuth } from "~/context/AuthContext";
import { Card, Button, Alert, Spinner } from "~/components/ui";

const REDIRECT_DELAY = 5000;

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const verifyMutation = useVerifyEmail();
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Trigger verification when token changes
   */
  useEffect(() => {
    if (!token) return;
    verifyMutation.mutate(token);
  }, [token]);

  /**
   * Success flow (delay BEFORE login / redirect)
   */
  useEffect(() => {
    if (!verifyMutation.isSuccess) return;

    const timeout = setTimeout(() => {
      const data = verifyMutation.data;

      if (data?.token) {
        login(data.token);
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    }, REDIRECT_DELAY);

    return () => clearTimeout(timeout);
  }, [verifyMutation.isSuccess]);

  /**
   * Error flow (delay redirect)
   */
  useEffect(() => {
    if (!verifyMutation.isError) return;

    const timeout = setTimeout(() => {
      navigate("/login", { replace: true });
    }, REDIRECT_DELAY);

    return () => clearTimeout(timeout);
  }, [verifyMutation.isError]);

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
      {verifyMutation.isPending && (
        <div className="flex flex-col items-center space-y-4">
          <Spinner />
          <h2 className="text-xl font-semibold text-gray-100">
            Verifying your email...
          </h2>
          <p className="text-gray-500 text-sm">
            Please wait while we confirm your token.
          </p>
        </div>
      )}

      {verifyMutation.isSuccess && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mb-2">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-100">Email Verified!</h2>
          <p className="text-gray-500">
            You’ll be redirected to your dashboard shortly.
          </p>

          <Link to="/dashboard" className="w-full">
            <Button className="w-full">Go to Dashboard Now</Button>
          </Link>
        </div>
      )}

      {verifyMutation.isError && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-2">
            ✕
          </div>
          <h2 className="text-2xl font-bold text-gray-100">
            Verification Failed
          </h2>
          <p className="text-gray-500 mb-6">
            {(verifyMutation.error as any)?.response?.data?.message ||
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
