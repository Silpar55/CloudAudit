/**
 * CloudAudit — Team invitation route: `accept.tsx`.
 * Accept or preview invites via token in URL or session.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router";
import { Alert, Button, Card, SectionLoader } from "~/components/ui";
import { teamMemberService } from "~/services/teamMemberService";
import { useAuth } from "~/context/AuthContext";
import {
  setPendingInviteToken,
  clearPendingInviteToken,
} from "~/utils/pendingInviteToken";

type Preview = {
  teamName: string;
  invitedEmail: string;
  expiresAt?: string;
  isGlobalLink?: boolean;
};

export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, isChecking } = useAuth();
  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    if (token) setPendingInviteToken(token);
    else setPendingInviteToken(null);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setPreview(null);
        setError("This invite link is missing a token.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await teamMemberService.previewInvitation(token);
        if (!cancelled) setPreview(data);
      } catch (e: any) {
        if (!cancelled) {
          setPreview(null);
          setError(
            e.response?.data?.message ||
              "This invitation is invalid or has expired.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (
      !token ||
      !isAuthenticated ||
      isChecking ||
      loading ||
      error ||
      !preview
    )
      return;

    let cancelled = false;
    (async () => {
      try {
        setAccepting(true);
        setError(null);
        const res = await teamMemberService.acceptInvitationByToken(token);
        const teamId = res?.teamId;
        clearPendingInviteToken();
        if (!cancelled && teamId) {
          navigate(`/teams/${teamId}`);
        } else if (!cancelled) {
          setError("Invitation accepted, but we couldn't redirect you.");
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e.response?.data?.message ||
              "Could not accept invitation. Please ask for a new invite.",
          );
        }
      } finally {
        if (!cancelled) setAccepting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated, isChecking, loading, error, preview, navigate]);

  const loginHref = `/login?invite=${encodeURIComponent(token)}`;
  const signupHref = `/signup?invite=${encodeURIComponent(token)}`;

  return (
    <div className="p-8 mx-auto w-full max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Workspace invitation
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {preview
          ? `You've been invited to join ${preview.teamName}.`
          : "Review your invitation below."}
      </p>

      <Card padding="lg" className="border-gray-200 dark:border-slate-700">
        {loading ? (
          <div className="py-8">
            <SectionLoader />
          </div>
        ) : accepting ? (
          <div className="py-8">
            <SectionLoader />
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              Joining workspace…
            </p>
          </div>
        ) : error ? (
          <div className="space-y-4">
            <Alert variant="danger" title="Could not use this invitation">
              {error}
            </Alert>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Go to dashboard
              </Button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-5 py-2.5 text-sm border-2 border-aws-orange text-aws-orange hover:bg-aws-orange hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        ) : preview && isChecking ? (
          <div className="py-8">
            <SectionLoader />
          </div>
        ) : preview && !isAuthenticated ? (
          <div className="space-y-4">
            {preview.isGlobalLink ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This is a shared workspace link for{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {preview.teamName}
                  </span>
                  . Create an account with the email you want to use, verify it,
                  then you&apos;ll join the workspace.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  You can also sign in with your existing account to join the
                  workspace.
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                This invite is for{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {preview.invitedEmail}
                </span>
                . Sign in with that email if you already have an account, or
                create a new account using the same address. You&apos;ll verify
                your email before you can join.
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link
                to={loginHref}
                className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-5 py-2.5 text-sm bg-aws-orange text-white shadow-md hover:bg-aws-orange-dark"
              >
                Sign in
              </Link>
              <Link
                to={signupHref}
                className="inline-flex items-center justify-center gap-2 font-semibold rounded-lg px-5 py-2.5 text-sm border-2 border-aws-orange text-aws-orange hover:bg-aws-orange hover:text-white"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : preview && isAuthenticated ? (
          <Alert variant="success" title="Almost there">
            Adding you to {preview.teamName}…
          </Alert>
        ) : null}
      </Card>
    </div>
  );
}
