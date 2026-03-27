import { sendEmail } from "#utils/aws/ses.js";
import {
  formatWeeklyReportEmail,
  formatAnomalyAlertEmail,
  formatMlAnalysisPassedEmail,
} from "./emailTemplates.js";

let warnedDisabledWithRecipients = false;

const isEmailEnabled = () => {
  const flagOn = process.env.EMAIL_NOTIFICATIONS_ENABLED === "true";
  const hasRecipients = Boolean(process.env.NOTIFICATIONS_EMAIL_TO?.trim());

  if (
    !flagOn &&
    hasRecipients &&
    process.env.NODE_ENV !== "test" &&
    !warnedDisabledWithRecipients
  ) {
    warnedDisabledWithRecipients = true;
    console.warn(
      '[notifications] SES ML/weekly emails are skipped: set EMAIL_NOTIFICATIONS_ENABLED=true (verification emails still use SES).',
    );
  }

  return flagOn && hasRecipients;
};

const getRecipients = () => {
  const raw = process.env.NOTIFICATIONS_EMAIL_TO || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

export const sendWeeklyReportEmail = async (summary) => {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: "Email notifications disabled" };
  }

  const toAddresses = getRecipients();
  if (toAddresses.length === 0) {
    return { skipped: true, reason: "No notification recipients configured" };
  }

  const { subject, html, text } = formatWeeklyReportEmail(summary ?? {});
  return sendEmail({ toAddresses, subject, htmlBody: html, textBody: text });
};

export const sendAnomalyAlertEmail = async (alert) => {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: "Email notifications disabled" };
  }

  const toAddresses = getRecipients();
  if (toAddresses.length === 0) {
    return { skipped: true, reason: "No notification recipients configured" };
  }

  const { subject, html, text } = formatAnomalyAlertEmail(alert ?? {});
  return sendEmail({ toAddresses, subject, htmlBody: html, textBody: text });
};

export const sendMlAnalysisPassedEmail = async (summary) => {
  if (!isEmailEnabled()) {
    return { skipped: true, reason: "Email notifications disabled" };
  }

  const toAddresses = getRecipients();
  if (toAddresses.length === 0) {
    return { skipped: true, reason: "No notification recipients configured" };
  }

  const { subject, html, text } = formatMlAnalysisPassedEmail(summary ?? {});
  return sendEmail({ toAddresses, subject, htmlBody: html, textBody: text });
};

