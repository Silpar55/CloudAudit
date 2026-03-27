const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const brandColor = "#f97316"; // aws-orange-ish
const textColor = "#111827";
const mutedColor = "#6b7280";
const divider = "#e5e7eb";

const baseEmailWrapperStart = (title) => `
  <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: ${textColor};">
    <div style="background:${brandColor}; padding:18px 20px; border-radius:10px 10px 0 0;">
      <h2 style="margin:0; font-size:18px; color:#ffffff;">${escapeHtml(title)}</h2>
    </div>
    <div style="border:1px solid ${divider}; border-top:none; padding:22px 20px; border-radius:0 0 10px 10px; background:#ffffff;">
`;

const baseEmailWrapperEnd = () => `
    <div style="margin-top:18px; font-size:12px; color:${mutedColor}; line-height:1.5;">
      This is an automated message from <strong>CloudAudit</strong>.
    </div>
  </div>
`;

const buildStatsTableRows = (rows) =>
  rows
    .map(
      (r) => `
  <tr>
    <td style="padding:10px 8px; border-bottom:1px solid ${divider}; font-size:13px; color:${mutedColor}; width: 45%;">
      ${escapeHtml(r.label)}
    </td>
    <td style="padding:10px 8px; border-bottom:1px solid ${divider}; font-size:13px; color:${textColor}; font-weight:bold;">
      ${escapeHtml(r.value)}
    </td>
  </tr>
`,
    )
    .join("");

export const formatWeeklyReportEmail = ({
  failed = false,
  errorMessage = "",
  totalAccounts = 0,
  successCount = 0,
  errorCount = 0,
  durationSec = "0.0",
}) => {
  const subject = failed
    ? "CloudAudit Weekly Report - FAILED"
    : "CloudAudit Weekly Cost Report - Completed";

  const title = failed
    ? "Weekly Recommendation Job Failed"
    : "Weekly Recommendation Job Completed";

  const statusLine = failed
    ? `Something went wrong while generating the weekly report.`
    : "The weekly report finished successfully.";

  const html = `${baseEmailWrapperStart(title)}
    <p style="margin:0 0 14px; font-size:14px; line-height:1.6;">
      ${escapeHtml(statusLine)}
    </p>

    <table style="width:100%; border-collapse:collapse; border:1px solid ${divider}; border-radius:10px; overflow:hidden;">
      <tbody>
        ${buildStatsTableRows([
          { label: "Accounts Processed", value: totalAccounts },
          { label: "Successful Accounts", value: successCount },
          { label: "Failed Accounts", value: errorCount },
          { label: "Duration", value: `${durationSec}s` },
        ])}
      </tbody>
    </table>

    ${
      failed
        ? `
    <div style="margin-top:14px; padding:12px 14px; border:1px solid #fee2e2; background:#fef2f2; border-radius:10px;">
      <p style="margin:0; font-size:13px; color:#991b1b; font-weight:bold;">Failure reason</p>
      <p style="margin:8px 0 0; font-size:12px; color:#991b1b; word-break:break-word;">${escapeHtml(
        errorMessage,
      )}</p>
    </div>
  `
        : ""
    }
  ${baseEmailWrapperEnd()}
`;

  const text = failed
    ? `CloudAudit weekly report FAILED\n\nAccounts Processed: ${totalAccounts}\nSuccessful Accounts: ${successCount}\nFailed Accounts: ${errorCount}\nDuration: ${durationSec}s\nFailure reason: ${errorMessage}`
    : `CloudAudit weekly cost report completed\n\nAccounts Processed: ${totalAccounts}\nSuccessful Accounts: ${successCount}\nFailed Accounts: ${errorCount}\nDuration: ${durationSec}s`;

  return { subject, html, text };
};

export const formatAnomalyAlertEmail = ({
  actorName = "User",
  awsAccountNumber,
  anomaliesDetected = 0,
  recommendationsGenerated = 0,
}) => {
  const subject = `CloudAudit ML Alert - ${anomaliesDetected} Anomalies`;

  const title = "ML Analysis - Anomalies Detected";

  const html = `${baseEmailWrapperStart(title)}
    <p style="margin:0 0 14px; font-size:14px; line-height:1.6;">
      Anomaly detection finished and <strong>${escapeHtml(
        anomaliesDetected,
      )}</strong> open anomaly(ies) were found.
    </p>

    <table style="width:100%; border-collapse:collapse; border:1px solid ${divider}; border-radius:10px; overflow:hidden;">
      <tbody>
        ${buildStatsTableRows([
          { label: "Ran by", value: actorName },
          { label: "AWS Account", value: awsAccountNumber },
          { label: "Anomalies Detected", value: anomaliesDetected },
          { label: "Recommendations Generated", value: recommendationsGenerated },
        ])}
      </tbody>
    </table>
  ${baseEmailWrapperEnd()}
`;

  const text = `CloudAudit ML Alert\n\nRan by: ${actorName}\nAWS Account: ${awsAccountNumber}\nAnomalies Detected: ${anomaliesDetected}\nRecommendations Generated: ${recommendationsGenerated}`;

  return { subject, html, text };
};

export const formatMlAnalysisPassedEmail = ({
  actorName = "User",
  awsAccountNumber,
  recommendationsGenerated = 0,
}) => {
  const subject = `CloudAudit ML Analysis Passed - No Anomalies`;

  const title = "ML Analysis - No Anomalies Detected";

  const html = `${baseEmailWrapperStart(title)}
    <p style="margin:0 0 14px; font-size:14px; line-height:1.6;">
      The ML analysis passed successfully. <strong>No anomalies</strong> were detected for the selected account.
    </p>

    <table style="width:100%; border-collapse:collapse; border:1px solid ${divider}; border-radius:10px; overflow:hidden;">
      <tbody>
        ${buildStatsTableRows([
          { label: "Ran by", value: actorName },
          { label: "AWS Account", value: awsAccountNumber },
          { label: "Recommendations Generated", value: recommendationsGenerated },
        ])}
      </tbody>
    </table>
  ${baseEmailWrapperEnd()}
`;

  const text = `CloudAudit ML Analysis Passed\n\nRan by: ${actorName}\nAWS Account: ${awsAccountNumber}\nNo anomalies detected\nRecommendations Generated: ${recommendationsGenerated}`;

  return { subject, html, text };
};

