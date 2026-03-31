import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { Alert, Button, Card, SectionLoader } from "~/components/ui";
import { teamMemberService } from "~/services/teamMemberService";

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await teamMemberService.acceptInvitationByToken(token);
        const teamId = res?.teamId;
        if (!cancelled && teamId) {
          navigate(`/teams/${teamId}`);
        } else if (!cancelled) {
          setError("Invitation accepted, but we couldn't redirect you.");
        }
      } catch (e: any) {
        if (cancelled) return;
        const msg =
          e.response?.data?.message ||
          "Could not accept invitation. Please ask for a new invite.";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="p-8 mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Accept invitation
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        We&apos;re adding you to the workspace.
      </p>

      <Card padding="lg" className="border-gray-200 dark:border-slate-700">
        {loading ? (
          <div className="py-8">
            <SectionLoader />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <Alert variant="danger" title="Could not accept invitation">
              {error}
            </Alert>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Go to dashboard
            </Button>
          </div>
        ) : (
          <Alert variant="success" title="Invitation accepted">
            Redirecting…
          </Alert>
        )}
      </Card>
    </div>
  );
}

