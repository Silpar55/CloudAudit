import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { sendWeeklyReportEmail } from "#utils/notifications/email.js";
import { sendEmail } from "#utils/aws/ses.js";

jest.mock("#utils/aws/ses.js", () => ({
  sendEmail: jest.fn().mockResolvedValue({ MessageId: "test-message-id" }),
}));

describe("Email notification utility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_NOTIFICATIONS_ENABLED = "false";
    process.env.NOTIFICATIONS_EMAIL_TO = "";
  });

  it("skips when email notifications disabled", async () => {
    const res = await sendWeeklyReportEmail({
      totalAccounts: 1,
      successCount: 1,
      errorCount: 0,
      durationSec: "1.0",
    });

    expect(res).toEqual({
      skipped: true,
      reason: "Email notifications disabled",
    });
  });

  it("sends when enabled and recipients configured", async () => {
    process.env.EMAIL_NOTIFICATIONS_ENABLED = "true";
    process.env.NOTIFICATIONS_EMAIL_TO = "ops@example.com, team@example.com";
    sendEmail.mockResolvedValue({ MessageId: "abc" });

    await sendWeeklyReportEmail({
      totalAccounts: 1,
      successCount: 1,
      errorCount: 0,
      durationSec: "1.0",
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});

