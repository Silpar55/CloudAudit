const isSlackEnabled = () =>
  process.env.SLACK_NOTIFICATIONS_ENABLED === "true" &&
  Boolean(process.env.SLACK_WEBHOOK_URL);

export const formatWeeklySlackMessage = ({
  totalAccounts = 0,
  successCount = 0,
  errorCount = 0,
  durationSec = "0.0",
  failed = false,
  errorMessage = "",
}) => {
  const headerText = failed
    ? "CloudAudit Weekly Report Failed"
    : "CloudAudit Weekly Cost Report";
  const statusEmoji = failed ? ":x:" : ":bar_chart:";
  const statusText = failed ? "Failed" : "Completed";

  const fields = [
    {
      type: "mrkdwn",
      text: `*Status:*\n${statusEmoji} ${statusText}`,
    },
    {
      type: "mrkdwn",
      text: `*Duration:*\n${durationSec}s`,
    },
    {
      type: "mrkdwn",
      text: `*Accounts Processed:*\n${totalAccounts}`,
    },
    {
      type: "mrkdwn",
      text: `*Successful Accounts:*\n${successCount}`,
    },
    {
      type: "mrkdwn",
      text: `*Failed Accounts:*\n${errorCount}`,
    },
  ];

  if (failed && errorMessage) {
    fields.push({
      type: "mrkdwn",
      text: `*Failure Reason:*\n\`${errorMessage}\``,
    });
  }

  return {
    text: `${headerText} - ${statusText}`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: headerText,
        },
      },
      {
        type: "section",
        fields,
      },
    ],
  };
};

export const formatAnomalySlackMessage = ({
  actorName = "User",
  awsAccountNumber,
  anomaliesDetected = 0,
  recommendationsGenerated = 0,
}) => ({
  text: `${actorName} ran analysis: ${anomaliesDetected} anomalies, ${recommendationsGenerated} recommendations`,
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "CloudAudit ML Analysis - Anomalies Detected",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Ran by:*\n${actorName}`,
        },
        {
          type: "mrkdwn",
          text: `*AWS Account:*\n\`${awsAccountNumber}\``,
        },
        {
          type: "mrkdwn",
          text: `*Anomalies Detected:*\n:rotating_light: ${anomaliesDetected}`,
        },
        {
          type: "mrkdwn",
          text: `*Recommendations Generated:*\n${recommendationsGenerated}`,
        },
      ],
    },
  ],
});

export const formatMlAnalysisPassedSlackMessage = ({
  actorName = "User",
  awsAccountNumber,
  recommendationsGenerated = 0,
}) => ({
  text: `${actorName} ran analysis: 0 anomalies, ${recommendationsGenerated} recommendations`,
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "CloudAudit ML Analysis",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Ran by:*\n${actorName}`,
        },
        {
          type: "mrkdwn",
          text: `*AWS Account:*\n\`${awsAccountNumber}\``,
        },
        {
          type: "mrkdwn",
          text: `*Result:*\n:white_check_mark: No anomalies detected`,
        },
        {
          type: "mrkdwn",
          text: `*Recommendations Generated:*\n${recommendationsGenerated}`,
        },
      ],
    },
  ],
});

export const sendSlackMessage = async (payload) => {
  if (!isSlackEnabled()) {
    return { skipped: true, reason: "Slack notifications disabled" };
  }

  const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Slack webhook request failed with status ${response.status}. ${body}`.trim(),
    );
  }

  return { ok: true };
};

export const sendWeeklyReportSlackMessage = async (summary) => {
  const payload = formatWeeklySlackMessage(summary);
  return sendSlackMessage(payload);
};

export const sendAnomalyAlertSlackMessage = async (alert) => {
  const payload = formatAnomalySlackMessage(alert);
  return sendSlackMessage(payload);
};

export const sendMlAnalysisPassedSlackMessage = async (summary) => {
  const payload = formatMlAnalysisPassedSlackMessage(summary);
  return sendSlackMessage(payload);
};
