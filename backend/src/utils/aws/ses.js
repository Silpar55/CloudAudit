import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Initialize the SES client (picks up AWS_REGION and credentials from environment)
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const sendVerificationEmail = async (toAddress, token) => {
  // Use your frontend URL from the environment, fallback to localhost for dev
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const verifyLink = `${frontendUrl}/verify-email?token=${token}`;

  // The email address you verified in the AWS SES Console
  const senderEmail = process.env.SES_SENDER_EMAIL;

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Subject: {
        Data: "Verify your new email address - CloudAudit",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Email Verification Request</h2>
              <p>You recently requested to change the email address associated with your account.</p>
              <p>Please click the button below to verify this new email address. This link will expire in 1 hour.</p>
              <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Verify Email</a>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not request this change, please ignore this email or contact support.</p>
            </div>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `You requested an email change. Verify your new email by visiting this link: ${verifyLink} (Expires in 1 hour)`,
          Charset: "UTF-8",
        },
      },
    },
  };

  const command = new SendEmailCommand(params);
  return await sesClient.send(command);
};

export const sendPasswordResetEmail = async (toAddress, token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const resetLink = `${frontendUrl}/reset-password?token=${token}`;
  const senderEmail = process.env.SES_SENDER_EMAIL;

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Subject: {
        Data: "Reset your password - CloudAudit",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset Request</h2>
              <p>We received a request to reset the password for your CloudAudit account.</p>
              <p>Please click the button below to set a new password. This link will expire in 1 hour.</p>
              <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #007bff; text-decoration: none; border-radius: 5px;">Reset Password</a>
              <p style="margin-top: 20px; font-size: 12px; color: #666;">If you did not request this, please ignore this email. Your password will not be changed.</p>
            </div>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `Reset your password by visiting this link: ${resetLink} (Expires in 1 hour)`,
          Charset: "UTF-8",
        },
      },
    },
  };

  const command = new SendEmailCommand(params);
  return await sesClient.send(command);
};

export const sendEmail = async ({
  toAddresses,
  subject,
  htmlBody,
  textBody,
}) => {
  const senderEmail = process.env.SES_SENDER_EMAIL;
  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: toAddresses,
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: "UTF-8",
        },
        Text: {
          Data: textBody,
          Charset: "UTF-8",
        },
      },
    },
  };

  const command = new SendEmailCommand(params);
  return await sesClient.send(command);
};

export const sendTeamInvitationEmail = async ({
  toAddress,
  teamName,
  token,
  invitedByName,
  isOpenInvite = false,
}) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const inviteLink = `${frontendUrl}/invite/accept?token=${token}`;
  const senderEmail = process.env.SES_SENDER_EMAIL;

  const subject = `You're invited to join ${teamName} — CloudAudit`;
  const safeInvitedBy = invitedByName ? `${invitedByName} ` : "";
  const openCopy = isOpenInvite
    ? "<p>If you already have a CloudAudit account, sign in with this email to join. If not, create an account with the same email, verify it, then open the link again.</p>"
    : "";
  const openCopyText = isOpenInvite
    ? "If you already have a CloudAudit account, sign in with this email to join. If not, create an account with the same email, verify it, then open the link again.\n\n"
    : "";

  const params = {
    Source: senderEmail,
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Workspace invitation</h2>
              <p>${safeInvitedBy}invited you to join the <strong>${teamName}</strong> workspace on CloudAudit.</p>
              ${openCopy}
              <p>Click below to accept this invitation.</p>
              <a href="${inviteLink}" style="display: inline-block; padding: 10px 20px; color: #fff; background-color: #f58536; text-decoration: none; border-radius: 8px; font-weight: 700;">Accept invitation</a>
              <p style="margin-top: 16px; font-size: 12px; color: #666;">If you weren't expecting this, you can ignore this email.</p>
            </div>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `${safeInvitedBy}invited you to join the "${teamName}" workspace on CloudAudit.\n\n${openCopyText}Accept: ${inviteLink}\n\nIf you weren't expecting this, ignore this email.`,
          Charset: "UTF-8",
        },
      },
    },
  };

  const command = new SendEmailCommand(params);
  return await sesClient.send(command);
};
