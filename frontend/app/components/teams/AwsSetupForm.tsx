import React, { useState } from "react";
import { useProvisionAwsAccount, useActivateAwsAccount } from "~/hooks/useAws";
import { AlertTriangle, CheckCircle, Copy, ArrowLeft } from "lucide-react";
import { Button, Input, Spinner } from "~/components/ui";

interface AwsSetupFormProps {
  teamId: string;
}

const AwsSetupForm: React.FC<AwsSetupFormProps> = ({ teamId }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [roleArn, setRoleArn] = useState("");
  const [scripts, setScripts] = useState<{
    trustPolicy: any;
    permissionPolicy: any;
  } | null>(null);

  const provisionMutation = useProvisionAwsAccount();
  const activateMutation = useActivateAwsAccount();

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleArn.trim()) return;

    provisionMutation.mutate(
      { teamId, roleArn },
      {
        onSuccess: (data) => {
          setScripts(data.script);
          setStep(2);
        },
      },
    );
  };

  const handleActivate = () => {
    activateMutation.mutate({ teamId, roleArn });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Connect AWS Account
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Provide your IAM Role ARN to generate the necessary security policies.
        </p>

        <form onSubmit={handleProvision} className="space-y-4">
          <div>
            <Input
              type="text"
              label="IAM Role ARN"
              required
              value={roleArn}
              onChange={(e: any) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/MyCostRole"
            />
          </div>

          {provisionMutation.isError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>
                Failed to provision account. Please check the ARN and try again.
              </span>
            </div>
          )}

          <Button
            type="submit"
            disabled={provisionMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {provisionMutation.isPending ? (
              <Spinner navbar={false} />
            ) : (
              "Generate Policies"
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setStep(1)}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Apply Policies in AWS
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Update your IAM Role (
            <span className="font-mono text-sm">{roleArn}</span>) with the
            following configurations.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Trust Policy Section */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              1. Trust Policy
            </h3>
            <button
              onClick={() =>
                handleCopy(JSON.stringify(scripts?.trustPolicy, null, 2))
              }
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Copy className="w-4 h-4" /> Copy JSON
            </button>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200">
            {JSON.stringify(scripts?.trustPolicy, null, 2)}
          </pre>
        </div>

        {/* Permission Policy Section */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              2. Permission Policy
            </h3>
            <button
              onClick={() =>
                handleCopy(JSON.stringify(scripts?.permissionPolicy, null, 2))
              }
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Copy className="w-4 h-4" /> Copy JSON
            </button>
          </div>
          <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md overflow-x-auto border border-gray-200 dark:border-gray-700 text-sm font-mono text-gray-800 dark:text-gray-200">
            {JSON.stringify(scripts?.permissionPolicy, null, 2)}
          </pre>
        </div>

        {activateMutation.isError && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <p className="font-medium">Verification Failed</p>
              <p className="text-sm mt-1">
                We couldn't assume the role. Please ensure the policies are
                attached correctly and the external ID matches.
              </p>
            </div>
          </div>
        )}

        <button
          onClick={handleActivate}
          disabled={activateMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-md transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {activateMutation.isPending ? (
            <Spinner navbar={false} />
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> Test & Activate Connection
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AwsSetupForm;
