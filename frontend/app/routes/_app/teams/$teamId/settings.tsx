import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  SectionLoader,
  Textarea,
} from "~/components/ui";
import { useWorkspaceTeamData } from "~/hooks/useWorkspaceTeamData";
import { useDeleteTeam, useUpdateTeam } from "~/hooks/useTeam";
import { useUpdateMyAnalysisNotifications } from "~/hooks/useTeamMember";
import { Settings, Trash2 } from "lucide-react";
import { Toggle } from "~/components/ui";

export default function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: workspace, isLoading: workspaceLoading } =
    useWorkspaceTeamData(teamId);
  const updateTeam = useUpdateTeam(teamId);
  const deleteTeam = useDeleteTeam();
  const notifyAnalysis = useUpdateMyAnalysisNotifications(teamId);

  const team = workspace?.team;
  const teamMember = workspace?.teamMember;
  const canManage =
    teamMember && ["admin", "owner"].includes(teamMember.role);
  const isOwner = teamMember?.role === "owner";

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pageError, setPageError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!team) return;
    setName(team.name ?? "");
    setDescription(team.description ?? "");
  }, [team?.team_id, team?.name, team?.description]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPageError(null);
    setSuccessMessage(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setPageError("Workspace name is required.");
      return;
    }
    try {
      await updateTeam.mutateAsync({
        name: trimmed,
        description: description.trim() || null,
      });
      setSuccessMessage("Workspace settings saved.");
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String((err.response.data as { message?: string }).message)
          : "Could not update workspace.";
      setPageError(msg);
    }
  };

  const handleDelete = async () => {
    if (!teamId) return;
    setPageError(null);
    try {
      await deleteTeam.mutateAsync(teamId);
      setDeleteOpen(false);
      navigate("/dashboard");
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String((err.response.data as { message?: string }).message)
          : "Could not delete workspace.";
      setPageError(msg);
    }
  };

  const dirty =
    team &&
    (name.trim() !== (team.name ?? "").trim() ||
      (description.trim() || "") !== (team.description ?? "").trim());

  if (workspaceLoading || !workspace) {
    return (
      <div className="p-8">
        <SectionLoader />
      </div>
    );
  }

  return (
    <div className="p-8 mx-auto w-full space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          Workspace settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Update how this workspace appears to your team. Deleting a workspace
          removes all associated data and cannot be undone.
        </p>
      </div>

      {pageError && (
        <Alert variant="danger" title="Something went wrong">
          {pageError}
        </Alert>
      )}

      {successMessage && (
        <Alert variant="success" title="Saved">
          {successMessage}
        </Alert>
      )}

      <Card padding="lg" className="shadow-lg">
        {canManage ? (
          <form onSubmit={handleSave} className="space-y-6">
            <Input
              label="Workspace name"
              name="name"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder="e.g. Platform Engineering"
              required
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="What is this workspace for?"
              rows={4}
            />
            <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-slate-700">
              <Button
                type="submit"
                disabled={!dirty || updateTeam.isPending}
              >
                {updateTeam.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Only workspace owners and admins can edit these settings.
            </p>
            <div className="pt-2 space-y-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {team?.name}
              </p>
              {team?.description ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {team.description}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <Card padding="lg" className="shadow-lg border border-gray-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
          Analysis emails
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          When AI analysis runs on your linked AWS account, we can email you
          about anomalies and recommendations for this workspace only.
        </p>
        <Toggle
          label="Email me when analysis completes"
          checked={teamMember?.notify_analysis_email !== false}
          disabled={notifyAnalysis.isPending}
          onChange={(on: boolean) => {
            notifyAnalysis.mutate({
              notify_analysis_email: on,
              analysis_prefs_prompted: true,
            });
          }}
        />
      </Card>

      <Card padding="lg" className="shadow-lg border border-gray-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Status</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white capitalize">
              {team?.status?.replace(/_/g, " ") ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Members</dt>
            <dd className="mt-1 font-medium text-gray-900 dark:text-white">
              {team?.member_count ?? "—"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500 dark:text-gray-400">Workspace ID</dt>
            <dd className="mt-1 font-mono text-xs text-gray-700 dark:text-gray-300 wrap-break-word">
              {team?.team_id}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500 dark:text-gray-400">Created</dt>
            <dd className="mt-1 text-gray-900 dark:text-white">
              {team?.created_at
                ? new Date(team.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—"}
            </dd>
          </div>
        </dl>
      </Card>

      {canManage && (
        <Card
          padding="lg"
          className="shadow-lg border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20"
        >
          <h2 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            Danger zone
          </h2>
          <p className="text-sm text-red-700/90 dark:text-red-300/90 mb-4">
            Permanently delete this workspace and all of its data. This action
            cannot be reversed.
          </p>
          {!isOwner && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Deleting a workspace is restricted to the workspace owner. Contact
              an owner if you need this workspace removed.
            </p>
          )}
          <Button
            type="button"
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => {
              setPageError(null);
              setDeleteOpen(true);
            }}
            disabled={!isOwner || deleteTeam.isPending}
          >
            Delete workspace
          </Button>
        </Card>
      )}

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="max-w-md"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Delete this workspace?
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
          <span className="font-medium text-gray-900 dark:text-white">
            {team?.name}
          </span>{" "}
          will be removed for everyone. Billing and AWS linkage for this
          workspace will stop. This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleteTeam.isPending}
          >
            {deleteTeam.isPending ? "Deleting…" : "Delete workspace"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
