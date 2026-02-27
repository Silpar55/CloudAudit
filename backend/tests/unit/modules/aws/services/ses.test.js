import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { sendVerificationEmail } from "#utils/aws/ses.js";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Mock the AWS SDK
jest.mock("@aws-sdk/client-ses");

describe("SES Utility - sendVerificationEmail", () => {
  let mockSend;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the mock send function for the SESClient instance
    mockSend = jest.fn().mockResolvedValue({ MessageId: "test-message-id" });
    SESClient.prototype.send = mockSend;
  });

  it("Should send an email with the correct parameters and token", async () => {
    const toAddress = "newemail@example.com";
    const token = "secure-token-123";

    // Mock environment variables
    process.env.SES_SENDER_EMAIL = "noreply@cloudaudit.com";
    process.env.FRONTEND_URL = "http://localhost:5173";

    const result = await sendVerificationEmail(toAddress, token);

    // Verify the command was instantiated
    expect(SendEmailCommand).toHaveBeenCalled();

    // Extract the arguments passed to SendEmailCommand
    const commandArgs = SendEmailCommand.mock.calls[0][0];

    expect(commandArgs.Destination.ToAddresses).toContain(toAddress);
    expect(commandArgs.Source).toBe("noreply@cloudaudit.com");
    expect(commandArgs.Message.Body.Html.Data).toContain(token);
    expect(commandArgs.Message.Body.Html.Data).toContain(
      "http://localhost:5173/verify-email",
    );

    // Verify the client sent the command
    expect(mockSend).toHaveBeenCalled();
    expect(result.MessageId).toBe("test-message-id");
  });

  it("Should throw an error if AWS SES fails", async () => {
    mockSend.mockRejectedValue(new Error("AWS SES Error"));

    await expect(
      sendVerificationEmail("test@example.com", "token"),
    ).rejects.toThrow("AWS SES Error");
  });
});
