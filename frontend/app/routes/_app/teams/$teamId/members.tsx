/**
 * CloudAudit — Authenticated app route: `members.tsx`.
 * Requires login; lives under the main app shell (sidebar/header).
 */

import React, { useEffect, useState } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  Input,
  Badge,
  Alert,
  SectionLoader,
  Modal,
  Select,
} from "~/components/ui";
import { useWorkspaceTeamData } from "~/hooks/useWorkspaceTeamData";
import { useTeamMembers } from "~/hooks/useTeamMembers";
import { getAvatarColor, getInitials } from "~/utils/format";
import { validEmail } from "~/utils/validation";
import { teamMemberService } from "~/services/teamMemberService";
import { RefreshCw, Users, UserPlus, Trash2, Copy, Check } from "lucide-react";

const roleBadgeVariant = (role: string) => {
  if (role === "owner") return "primary";
  if (role === "admin") return "warning";
  return "default";
};

export default function TeamMembersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: workspace, isLoading: workspaceLoading } =
    useWorkspaceTeamData(teamId);
  const {
    members,
    loading,
    addMember,
    removeMember,
    updateRole,
    searchInviteCandidates,
    refetch,
  } =
    useTeamMembers(teamId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSuggestions, setInviteSuggestions] = useState<any[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteSelectedEmail, setInviteSelectedEmail] = useState<string | null>(
    null,
  );
  const [inviteStep, setInviteStep] = useState<"form" | "done">("form");
  const [sendInviteEmail, setSendInviteEmail] = useState(true);
  const [inviteResult, setInviteResult] = useState<{
    message?: string;
    inviteLink?: string;
    emailSent?: boolean;
    inviteEmailsSent?: number;
    /** False when user unchecked "Send invitation email" (link-only). */
    requestedEmail?: boolean;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    label: string;
  } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const user = workspace?.user;
  const teamMember = workspace?.teamMember;
  const canManage = teamMember && ["admin", "owner"].includes(teamMember.role);

  const { data: workspaceShareInvite, isLoading: workspaceShareLoading } =
    useQuery({
      queryKey: ["teamShareInvite", teamId],
      queryFn: () => teamMemberService.getOrCreateShareInvite(teamId!),
      enabled: Boolean(canManage && teamId),
      staleTime: Infinity,
    });

  const isOwner = teamMember?.role === "owner";
  const isAdmin = teamMember?.role === "admin";

  // Light polling so owners see new joins without hard refresh.
  useEffect(() => {
    if (!teamId) return;
    const t = setInterval(() => {
      refetch();
    }, 8000);
    return () => clearInterval(t);
  }, [teamId, refetch]);

  const resetInviteModal = () => {
    setInviteEmail("");
    setInviteSuggestions([]);
    setInviteSelectedEmail(null);
    setInviteStep("form");
    setInviteResult(null);
    setCopiedLink(false);
    setSendInviteEmail(true);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);
    const emailToInvite = (inviteSelectedEmail || inviteEmail).trim();
    if (!validEmail(emailToInvite)) {
      setPageError("Enter a valid email address.");
      return;
    }
    try {
      const data = await addMember.mutateAsync({
        email: emailToInvite,
        sendEmail: sendInviteEmail,
      });
      setInviteResult({
        message: data?.message,
        inviteLink: data?.inviteLink,
        emailSent: data?.emailSent,
        inviteEmailsSent: data?.inviteEmailsSent,
        requestedEmail: sendInviteEmail,
      });
      setInviteStep("done");
      setInviteEmail("");
      setInviteSuggestions([]);
      setInviteSelectedEmail(null);
    } catch (err: any) {
      const meta = err.response?.data?.meta;
      if (meta?.inviteLink) {
        setInviteResult({
          message: err.response?.data?.message,
          inviteLink: meta.inviteLink,
          emailSent: false,
          inviteEmailsSent: meta.inviteEmailsSent,
          requestedEmail: true,
        });
        setInviteStep("done");
        setInviteEmail("");
        setInviteSuggestions([]);
        setInviteSelectedEmail(null);
        return;
      }
      setPageError(
        err.response?.data?.message || "Could not invite this member.",
      );
    }
  };

  useEffect(() => {
    if (!inviteOpen) return;
    const q = inviteEmail.trim();
    if (!canManage || q.length < 2) {
      setInviteSuggestions([]);
      setInviteLoading(false);
      return;
    }

    let cancelled = false;
    setInviteLoading(true);
    const t = setTimeout(async () => {
      try {
        const users = await searchInviteCandidates(q);
        if (cancelled) return;
        setInviteSuggestions(users ?? []);
      } catch {
        if (cancelled) return;
        setInviteSuggestions([]);
      } finally {
        if (!cancelled) setInviteLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [inviteEmail, inviteOpen, canManage, searchInviteCandidates]);

  const handleRemove = async () => {
    if (!removeTarget) return;
    setPageError(null);
    try {
      await removeMember.mutateAsync(removeTarget.userId);
      setRemoveTarget(null);
    } catch (err: any) {
      setPageError(
        err.response?.data?.message || "Could not remove this member.",
      );
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setPageError(null);
    try {
      await updateRole.mutateAsync({ userId, newRole });
    } catch (err: any) {
      setPageError(
        err.response?.data?.message || "Could not update this role.",
      );
    }
  };

  const roleOptions = () => {
    return [
      { value: "member", label: "Member" },
      { value: "admin", label: "Admin" },
    ];
  };

  /**
   * Badge for every row. Select for owners/admins only:
   * - Owner: no select on own row; other owners → disabled select; members/admins → enabled.
   * - Admin: disabled on self, owners, and other admins; enabled only for other members.
   */
  const roleSelectConfig = (m: { user_id: string; role: string }) => {
    if (!canManage) return { show: false, disabled: true };
    if (isOwner) {
      if (m.user_id === user?.user_id) return { show: false, disabled: true };
      return { show: true, disabled: m.role === "owner" };
    }
    if (isAdmin) {
      const disabled =
        m.user_id === user?.user_id || m.role === "owner" || m.role === "admin";
      return { show: true, disabled };
    }
    return { show: false, disabled: true };
  };

  const canRemoveRow = (row: { user_id: string; role: string }) => {
    if (!canManage) return false;
    if (isOwner) {
      if (row.role === "owner" && !isOwner) return false;
      return true;
    }
    if (isAdmin) {
      if (row.user_id === user?.user_id) return false;
      return row.role === "member";
    }
    return false;
  };

  if (workspaceLoading || !workspace) {
    return (
      <div className="p-8">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-500" />
            Team Members
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            People with access to this workspace. Owners and admins can invite
            others and manage roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => refetch()}
            disabled={loading}
          >
            Refresh
          </Button>
          {canManage && (
            <Button
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => {
                setPageError(null);
                resetInviteModal();
                setInviteOpen(true);
              }}
            >
              Invite member
            </Button>
          )}
        </div>
      </div>

      {pageError && (
        <Alert variant="danger" title="Something went wrong">
          {pageError}
        </Alert>
      )}

      {canManage && (
        <Card padding="lg" className="border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Workspace invite link
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Share this link with anyone — they&apos;ll use the newcomer flow:
            create a CloudAudit account with their own email, verify it, then join
            this workspace. No need to enter an email here first.
          </p>
          {workspaceShareLoading ? (
            <div className="py-4">
              <SectionLoader />
            </div>
          ) : workspaceShareInvite?.inviteLink ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                readOnly
                className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200"
                value={workspaceShareInvite.inviteLink}
              />
              <Button
                type="button"
                variant="outline"
                icon={
                  copiedShareLink ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      workspaceShareInvite.inviteLink,
                    );
                    setCopiedShareLink(true);
                    setTimeout(() => setCopiedShareLink(false), 2000);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {copiedShareLink ? "Copied" : "Copy link"}
              </Button>
            </div>
          ) : null}
        </Card>
      )}

      {loading && members.length === 0 ? (
        <div className="py-12">
          <SectionLoader />
        </div>
      ) : members.length === 0 ? (
        <Card
          padding="lg"
          className="flex flex-col items-center justify-center text-center py-16 shadow-lg border-gray-200 dark:border-gray-700"
        >
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-indigo-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            No members yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-2">
            Invite teammates by email to collaborate in this workspace.
          </p>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden shadow-lg">
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {members.map((m) => {
              const displayName =
                `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email;
              const isSelf = user?.user_id === m.user_id;
              const avatarSource = m.first_name || m.email || "?";
              const selectCfg = roleSelectConfig(m);

              return (
                <div
                  key={m.team_member_id}
                  className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-6 p-6 hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {/* Left: identity */}
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className={`w-12 h-12 rounded-xl bg-linear-to-br ${getAvatarColor(avatarSource)} flex items-center justify-center text-white font-semibold shrink-0`}
                    >
                      {getInitials(
                        `${m.first_name || ""} ${m.last_name || ""}`.trim() ||
                          m.email,
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {displayName}
                        </p>
                        {isSelf && (
                          <Badge variant="info" size="sm">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {m.email}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Joined{" "}
                        {new Date(m.joined_at).toLocaleString("en-CA", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Center: role select only, vertically centered vs row height */}
                  {selectCfg.show && (
                    <div className="flex w-full shrink-0 items-center justify-center md:w-44 md:max-w-44 md:px-1">
                      <div className="w-full max-w-44 md:max-w-none">
                        <Select
                          value={m.role}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            handleRoleChange(m.user_id, e.target.value)
                          }
                          options={roleOptions()}
                          disabled={selectCfg.disabled || updateRole.isPending}
                          placeholder=""
                        />
                      </div>
                    </div>
                  )}

                  {/* Right: badge top, remove bottom — same column, maximum vertical space */}
                  <div
                    className={`flex w-full shrink-0 flex-col gap-5 items-end justify-between md:w-44 md:min-w-44 md:self-stretch ${
                      canRemoveRow(m)
                        ? "min-h-28 justify-between md:min-h-0 md:justify-between"
                        : "justify-start"
                    }`}
                  >
                    <div className="shrink-0">
                      <Badge variant={roleBadgeVariant(m.role)}>
                        {m.role.toUpperCase()}
                      </Badge>
                    </div>
                    {canRemoveRow(m) && selectCfg.show && (
                      <div className="shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={() => {
                            setPageError(null);
                            setRemoveTarget({
                              userId: m.user_id,
                              label: displayName,
                            });
                          }}
                          disabled={removeMember.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal
        isOpen={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          resetInviteModal();
        }}
        maxWidth="max-w-md"
      >
        {inviteStep === "done" && inviteResult ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Invitation ready
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {inviteResult.message}
            </p>
            {inviteResult.emailSent === false &&
              inviteResult.requestedEmail !== false && (
                <Alert variant="warning" title="Email not delivered">
                  Share the link below so they can join.
                </Alert>
              )}
            {typeof inviteResult.inviteEmailsSent === "number" &&
              inviteResult.inviteEmailsSent > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Invitation emails sent for this invite:{" "}
                  {inviteResult.inviteEmailsSent}/2
                </p>
              )}
            {inviteResult.inviteLink ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Invite link
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    className="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-3 py-2 text-xs text-gray-800 dark:text-gray-200"
                    value={inviteResult.inviteLink}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={
                      copiedLink ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )
                    }
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          inviteResult.inviteLink ?? "",
                        );
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    {copiedLink ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={() => {
                  setInviteOpen(false);
                  resetInviteModal();
                }}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Invite someone
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Enter an email address. You can copy a shareable link immediately,
              with or without sending email. If they already use CloudAudit, they
              can sign in and join. Otherwise they&apos;ll sign up with that email,
              verify it, then accept the invite.
            </p>
            <form onSubmit={handleInvite} className="space-y-4">
              <Input
                type="email"
                label="Email address"
                placeholder="colleague@company.com"
                value={inviteEmail}
                name="email"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const next = e.target.value;
                  setInviteEmail(next);
                  setInviteSelectedEmail(null);
                }}
                required
              />
              {inviteLoading ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Searching…
                </p>
              ) : inviteSuggestions.length > 0 ? (
                <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                  {inviteSuggestions.slice(0, 6).map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => {
                        setInviteEmail(u.email);
                        setInviteSelectedEmail(u.email);
                        setInviteSuggestions([]);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") ||
                          u.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {u.email}
                      </p>
                    </button>
                  ))}
                </div>
              ) : inviteEmail.trim().length >= 2 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No matching CloudAudit users yet — you can still send an invite
                  to this address.
                </p>
              ) : null}
              <label className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-gray-300 text-aws-orange focus:ring-aws-orange"
                  checked={sendInviteEmail}
                  onChange={(e) => setSendInviteEmail(e.target.checked)}
                />
                <span>
                  Send invitation email (up to two emails per invite if the first
                  doesn&apos;t arrive)
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setInviteOpen(false);
                    resetInviteModal();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    addMember.isPending ||
                    !validEmail((inviteSelectedEmail || inviteEmail).trim())
                  }
                >
                  {addMember.isPending
                    ? "Working…"
                    : sendInviteEmail
                      ? "Send invite"
                      : "Create invite link"}
                </Button>
              </div>
            </form>
          </>
        )}
      </Modal>

      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        maxWidth="max-w-md"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Remove member?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          {removeTarget && (
            <>
              <span className="font-medium text-gray-900 dark:text-white">
                {removeTarget.label}
              </span>{" "}
              will lose access to this workspace.
            </>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemove}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
