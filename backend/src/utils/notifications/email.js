/**
 * CloudAudit — Notification helper: `email`.
 * Email (SES), Slack, or templates for user-facing alerts.
 */

import { sendEmail } from "#utils/aws/ses.js";
import * as teamModel from "#modules/team/team.model.js";
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

/** ML / team alerts: SES sender must exist; do not require NOTIFICATIONS_EMAIL_TO. */
const canSendSesProductEmail = () =>
  process.env.EMAIL_NOTIFICATIONS_ENABLED === "true" &&
  Boolean(process.env.SES_SENDER_EMAIL?.trim());

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

/**
 * Sends ML analysis result emails to opted-in, verified members of the team
 * (not the global NOTIFICATIONS_EMAIL_TO / SES self-route).
 */
export const sendTeamMlAnalysisEmails = async (teamId, kind, payload) => {
  if (!canSendSesProductEmail()) {
    return { skipped: true, reason: "Email notifications or SES not configured" };
  }

  const recipients = await teamModel.getTeamAnalysisNotificationEmails(teamId);
  if (recipients.length === 0) {
    return {
      skipped: true,
      reason: "No team members opted in with verified email",
    };
  }

  const { subject, html, text } =
    kind === "anomaly"
      ? formatAnomalyAlertEmail(payload ?? {})
      : formatMlAnalysisPassedEmail(payload ?? {});

  for (const to of recipients) {
    await sendEmail({
      toAddresses: [to],
      subject,
      htmlBody: html,
      textBody: text,
    });
  }

  return { sent: recipients.length };
};

