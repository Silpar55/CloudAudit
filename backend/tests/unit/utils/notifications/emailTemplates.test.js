/**
 * CloudAudit — Unit tests for `emailTemplates`.
 * Run from `backend/` with `npm test`.
 */

import {
  formatWeeklyReportEmail,
  formatAnomalyAlertEmail,
  formatMlAnalysisPassedEmail,
} from "#utils/notifications/emailTemplates.js";

describe("Email templates", () => {
  it("formats weekly report email subject", () => {
    const { subject } = formatWeeklyReportEmail({
      failed: false,
      totalAccounts: 3,
      successCount: 3,
      errorCount: 0,
      durationSec: "12.5",
    });
    expect(subject).toContain("Completed");
  });

  it("formats anomaly alert email with expected values", () => {
    const { subject, text } = formatAnomalyAlertEmail({
      actorName: "User 1",
      awsAccountNumber: "123456789012",
      anomaliesDetected: 2,
      recommendationsGenerated: 0,
    });
    expect(subject).toContain("2");
    expect(text).toContain("AWS Account: 123456789012");
  });

  it("formats ML passed email for no anomalies", () => {
    const { subject, text } = formatMlAnalysisPassedEmail({
      actorName: "User 1",
      awsAccountNumber: "123456789012",
      recommendationsGenerated: 0,
    });
    expect(subject).toContain("Passed");
    expect(text).toContain("No anomalies detected");
  });
});

