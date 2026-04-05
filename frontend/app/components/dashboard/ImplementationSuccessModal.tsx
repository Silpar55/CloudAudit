/**
 * CloudAudit — Dashboard UI: `ImplementationSuccessModal.tsx`.
 * Cost, anomalies, recommendations, and team overview widgets.
 */

import React from "react";
import { ExternalLink, CheckCircle } from "lucide-react";
import { Button, Modal } from "~/components/ui";
import type { ImplementationSummary } from "~/services/recommendationsService";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  summary: ImplementationSummary | null;
};

/**
 * Shown after a successful one-click automated recommendation apply.
 */
const ImplementationSuccessModal: React.FC<Props> = ({
  isOpen,
  onClose,
  summary,
}) => {
  if (!summary) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="flex gap-3">
        <div className="shrink-0 rounded-full bg-green-100 dark:bg-green-900/40 p-2 h-fit">
          <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="text-left space-y-3 min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {summary.headline}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {summary.detail}
          </p>
          <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">
            Resource: {summary.resourceId}
            {summary.region ? ` · ${summary.region}` : null}
          </p>
          {summary.consoleUrl ? (
            <a
              href={summary.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Open in AWS Console
              <ExternalLink className="w-4 h-4 shrink-0" />
            </a>
          ) : null}
          <p className="text-xs text-gray-500 dark:text-gray-500 pt-1">
            Re-scanning may not recreate this item for 14 days after you
            implement it, so the list stays clean.
          </p>
          <div className="flex justify-end pt-2">
            <Button
              type="button"
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImplementationSuccessModal;
