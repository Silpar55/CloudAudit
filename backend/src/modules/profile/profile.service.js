import crypto from "crypto";
import * as profileModel from "./profile.model.js";
import { AppError } from "#utils/helper/AppError.js";
import { sendVerificationEmail } from "#utils/aws/ses.js";

export const getProfile = async (userId) => {
  const profile = await profileModel.getProfileById(userId);

  if (!profile) throw new AppError("User profile not found", 404);

  return profile;
};

export const updateProfileDetails = async (userId, updateData) => {
  const profile = await profileModel.updateProfile(userId, updateData);

  if (!profile) throw new AppError("Profile not found or update failed", 404);

  return profile;
};

export const requestEmailChange = async (userId, newEmail) => {
  // 1. Generate a secure random token
  const token = crypto.randomBytes(32).toString("hex");

  // 2. Set expiration to 1 hour from now
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  // 3. Save pending data to database
  await profileModel.setPendingEmail(userId, newEmail, token, expiresAt);

  // 4. Dispatch the email via AWS SES
  await sendVerificationEmail(newEmail, token);

  return { message: "Verification email sent" };
};
