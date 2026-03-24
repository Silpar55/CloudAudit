import React, { useState } from "react";
import { useParams } from "react-router";
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
import { Users, UserPlus, Trash2 } from "lucide-react";

const roleBadgeVariant = (role: string) => {
  if (role === "owner") return "primary";
  if (role === "admin") return "warning";
  return "default";
};

export default function TeamMembersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: workspace, isLoading: workspaceLoading } =
    useWorkspaceTeamData(teamId);
  const { members, loading, addMember, removeMember, updateRole } =
    useTeamMembers(teamId);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [removeTarget, setRemoveTarget] = useState<{
    userId: string;
    label: string;
  } | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);

  const user = workspace?.user;
  const teamMember = workspace?.teamMember;
  const canManage = teamMember && ["admin", "owner"].includes(teamMember.role);

  const isOwner = teamMember?.role === "owner";
  const isAdmin = teamMember?.role === "admin";

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);
    try {
      await addMember.mutateAsync(inviteEmail.trim());
      setInviteEmail("");
      setInviteOpen(false);
    } catch (err: any) {
      setPageError(
        err.response?.data?.message || "Could not invite this member.",
      );
    }
  };

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
    if (isOwner) {
      return [
        { value: "member", label: "Member" },
        { value: "admin", label: "Admin" },
        { value: "owner", label: "Owner" },
      ];
    }
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
        {canManage && (
          <Button
            icon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              setPageError(null);
              setInviteOpen(true);
            }}
          >
            Invite member
          </Button>
        )}
      </div>

      {pageError && (
        <Alert variant="danger" title="Something went wrong">
          {pageError}
        </Alert>
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
        onClose={() => setInviteOpen(false)}
        maxWidth="max-w-md"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Invite a member
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          They must already have a CloudAudit account. We&apos;ll send them into
          this workspace once they accept.
        </p>
        <form onSubmit={handleInvite} className="space-y-4">
          <Input
            type="email"
            label="Email address"
            placeholder="colleague@company.com"
            value={inviteEmail}
            name="email"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setInviteEmail(e.target.value)
            }
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setInviteOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={addMember.isPending}>
              {addMember.isPending ? "Sending…" : "Invite"}
            </Button>
          </div>
        </form>
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
