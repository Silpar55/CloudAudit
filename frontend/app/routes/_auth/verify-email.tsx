import { useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router";
import { useVerifyEmailChange } from "~/hooks/useProfile";
import { Card, Button, Alert, SectionLoader } from "~/components/ui";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const verifyMutation = useVerifyEmailChange();

  // Use a ref to prevent double-firing in React Strict Mode
  const hasAttempted = useRef(false);

  useEffect(() => {
    if (token && !hasAttempted.current) {
      hasAttempted.current = true;
      verifyMutation.mutate(token);
    }
  }, [token]);

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
          <SectionLoader />
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
          <h2 className="text-2xl font-bold text-gray-900">Email Verified!</h2>
          <p className="text-gray-500 mb-6">
            Your account email has been successfully updated.
          </p>
          <Link to="/dashboard" className="w-full">
            <Button className="w-full">Return to Dashboard</Button>
          </Link>
        </div>
      )}

      {verifyMutation.isError && (
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-2">
            ✕
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Verification Failed
          </h2>
          <p className="text-gray-500 mb-6">
            {(verifyMutation.error as any)?.response?.data?.message ||
              "The verification link is invalid or has expired."}
          </p>
          <Link to="/profile" className="w-full">
            <Button variant="outline" className="w-full">
              Back to Profile
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}
