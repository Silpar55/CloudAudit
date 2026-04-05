/**
 * CloudAudit — Team / AWS setup UI: `AwsSetupForm.tsx`.
 */

import React, { useState } from "react";
import { useProvisionAwsAccount, useActivateAwsAccount } from "~/hooks/useAws";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  Terminal,
  FileCode2,
  Info,
} from "lucide-react";
import { Button, Input, Spinner, Modal } from "~/components/ui";
import { isAxiosError } from "axios";

interface AwsSetupFormProps {
  teamId: string;
}

interface AwsScripts {
  trustPolicyJson: string;
  permissionsPolicyJson: string;
  cloudShellScript: string;
  instructions: {
    step1: string;
    step2: string;
    step3: string;
    externalId?: string;
  };
  cloudShellInstructions: {
    step1: string;
    step2: string;
    step3: string;
  };
}

const AwsSetupForm: React.FC<AwsSetupFormProps> = ({ teamId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [roleArn, setRoleArn] = useState("");
  const [scripts, setScripts] = useState<AwsScripts | null>(null);
  const [setupMethod, setSetupMethod] = useState<"cloudshell" | "manual">(
    "cloudshell",
  );
  const [accountConflictOpen, setAccountConflictOpen] = useState(false);

  const provisionMutation = useProvisionAwsAccount();
  const activateMutation = useActivateAwsAccount();

  const handleStartSetup = () => {
    // We send a placeholder ARN so the backend generates the external_id and DB row instantly
    provisionMutation.mutate(
      { teamId, roleArn: "arn:aws:iam::000000000000:role/PendingSetupRole" },
      {
        onSuccess: (data) => {
          setScripts(data.script);
          setStep(2);
        },
      },
    );
  };

  const handleActivate = () => {
    if (!roleArn.trim()) return;
    activateMutation.mutate(
      { teamId, roleArn },
      {
        onError: (err) => {
          if (isAxiosError(err) && err.response?.status === 409) {
            setAccountConflictOpen(true);
          }
        },
      },
    );
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Connect AWS Account
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
          CloudAudit requires read-only access to your AWS billing data. Click
          below to generate your secure, personalized IAM setup scripts.
        </p>

        {provisionMutation.isError && (
          <div className="p-3 mb-6 bg-red-50 text-red-700 rounded-md flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Failed to initialize setup. Please try again.</span>
          </div>
        )}

        <Button
          onClick={handleStartSetup}
          disabled={provisionMutation.isPending}
          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md transition-colors disabled:opacity-50"
        >
          {provisionMutation.isPending ? <Spinner /> : "Generate Setup Scripts"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Apply Policies in AWS
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Create your IAM Role using one of the methods below.
        </p>
      </div>

      <div className="space-y-6">
        {/* Setup Method Tabs */}
        <div className="flex space-x-6 border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setSetupMethod("cloudshell")}
            className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
              setupMethod === "cloudshell"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Terminal className="w-4 h-4" />
            1-Click CloudShell (Recommended)
          </button>
          <button
            onClick={() => setSetupMethod("manual")}
            className={`pb-3 text-sm font-medium flex items-center gap-2 transition-colors ${
              setupMethod === "manual"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            Manual IAM Setup
          </button>
        </div>

        {/* CloudShell Setup Content */}
        {setupMethod === "cloudshell" && scripts?.cloudShellInstructions && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-md">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-3">
                CloudShell Instructions
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
                <li>{scripts.cloudShellInstructions.step1}</li>
                <li>{scripts.cloudShellInstructions.step2}</li>
                <li>{scripts.cloudShellInstructions.step3}</li>
              </ol>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  CloudShell Script
                </h3>
                <button
                  onClick={() => handleCopy(scripts?.cloudShellScript || "")}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy Script
                </button>
              </div>
              <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto border border-gray-700 text-sm font-mono text-green-400 whitespace-pre-wrap max-h-125">
                {scripts?.cloudShellScript}
              </pre>
            </div>
          </div>
        )}

        {/* Manual Setup Content */}
        {setupMethod === "manual" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {scripts?.instructions && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-md">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-3">
                  Instructions
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200 text-sm">
                  <li>{scripts.instructions.step1}</li>
                  <li>{scripts.instructions.step2}</li>
                  <li>{scripts.instructions.step3}</li>
                </ol>
              </div>
            )}

            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  1. Trust Policy
                </h3>
                <button
                  onClick={() => handleCopy(scripts?.trustPolicyJson || "")}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy JSON
                </button>
              </div>
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {scripts?.trustPolicyJson}
              </pre>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  2. Permissions Policy
                </h3>
                <button
                  onClick={() =>
                    handleCopy(scripts?.permissionsPolicyJson || "")
                  }
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <Copy className="w-4 h-4" /> Copy JSON
                </button>
              </div>
              <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {scripts?.permissionsPolicyJson}
              </pre>
            </div>
          </div>
        )}

        {/* THE NEW FINAL VERIFICATION STEP */}
        <div className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Final Step: Verify & Activate
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Paste the newly created IAM Role ARN here to finalize the
            connection.
          </p>

          <div className="space-y-4">
            <Input
              type="text"
              label="IAM Role ARN"
              required
              value={roleArn}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setRoleArn(e.target.value)
              }
              placeholder="arn:aws:iam::123456789012:role/CloudAuditRole"
            />

            {activateMutation.isError &&
              !(
                isAxiosError(activateMutation.error) &&
                activateMutation.error.response?.status === 409
              ) && (
                <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-md flex items-start gap-3 mt-4 border border-red-100 dark:border-red-900/50">
                  <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Verification Failed</p>
                    <p className="text-sm mt-1">
                      We couldn&apos;t assume the role. Please ensure the policies
                      are attached correctly and the external ID matches your
                      CloudAudit workspace.
                    </p>
                  </div>
                </div>
              )}

            <Modal
              isOpen={accountConflictOpen}
              onClose={() => setAccountConflictOpen(false)}
              maxWidth="max-w-lg"
            >
              <div className="flex gap-3">
                <div className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/40 p-2 h-fit">
                  <Info className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="text-left space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AWS account already connected
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    This AWS account is already linked to another workspace in
                    this CloudAudit environment. Each account can only be
                    connected once here—you&apos;re not doing anything wrong, and
                    this isn&apos;t a system outage.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    Use the workspace that already has this account, or ask an
                    owner to disconnect it there before connecting it again.
                  </p>
                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={() => setAccountConflictOpen(false)}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Got it
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>

            <button
              onClick={handleActivate}
              disabled={activateMutation.isPending || !roleArn.trim()}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
            >
              {activateMutation.isPending ? (
                <Spinner />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" /> Test & Activate Connection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AwsSetupForm;
