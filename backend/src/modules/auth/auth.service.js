import crypto from "crypto";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "#utils/aws/ses.js";

import {
  validName,
  validEmail,
  validPassword,
  validPhone,
} from "#utils/validation.js";

import { hashPassword, comparePassword } from "#utils/password.js";

import { AppError } from "#utils/helper/AppError.js";

import * as authModel from "#modules/auth/auth.model.js";
import * as jwtHelper from "#utils/helper/jwt-helper.js";

export const registerUser = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  countryCode,
}) => {
  if (!validName(firstName)) throw new AppError("First name is invalid", 400);

  if (!validName(lastName)) throw new AppError("Last name is invalid", 400);

  if (!validEmail(email)) throw new AppError("Email is invalid", 400);

  // Check if email exist in the database
  const userInDB = await authModel.findUser(email);

  if (userInDB)
    throw new AppError("Email already registered, try other email", 400);

  if (!validPhone(phone, countryCode))
    // Country code should be ISO-2
    throw new AppError("Phone number is invalid", 400);

  const passwordResults = validPassword(password);
  if (passwordResults.length > 0)
    throw new AppError(
      `Password is invalid check the following ${passwordResults[0].message}`,
      400,
    );

  const hashPass = await hashPassword(password);

  // Generate the verification token and expiration date
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: hashPass,
    phone,
    countryCode,
    verificationToken,
    verificationExpiresAt,
  };

  const result = await authModel.createUser(user);

  if (!result) throw new AppError("Unable to create a user", 422);

  await sendVerificationEmail(result.email, verificationToken);

  return {
    result,
    message:
      "Signup successful. Please check your email to verify your account.",
  };
};

export const loginUser = async ({ email, password }) => {
  if (!validEmail(email)) throw new AppError("Email is invalid", 400);

  const passwordResults = validPassword(password);
  if (passwordResults.length > 0)
    throw new AppError(
      `Password is invalid check the following ${passwordResults[0].message}`,
      400,
    );

  const user = await authModel.findUser(email);
  if (!user || !(await comparePassword(password, user.password || "")))
    throw new AppError("Invalid credentials, try again", 404);

  // SECURITY PATCH: Block zombie logins
  if (user.is_active === false) {
    throw new AppError("Invalid credentials, try again", 404); // Keep generic so attackers don't know it's deleted
  }

  if (!user.email_verified) {
    throw new AppError(
      "Please verify your email address before logging in.",
      403,
    );
  }

  return user;
};

export const getUser = async (token) => {
  if (!token) throw new AppError("Access denied", 401);

  try {
    const decoded = jwtHelper.verifyJwtHelper(token);
    const user = await authModel.findUserById(decoded?.userId);

    // SECURITY PATCH: Invalidate token if user was deactivated
    if (!user || user.is_active === false) {
      throw new Error("User deactivated"); // This pushes execution to the catch block
    }

    return user;
  } catch (_e) {
    throw new AppError("Invalid or expire token", 401);
  }
};

export const verifyEmailToken = async (token) => {
  const user = await authModel.getUserByVerificationToken(token);

  // SECURITY PATCH: Ensure user is active
  if (!user || user.is_active === false) {
    throw new AppError("Invalid verification token", 400);
  }

  if (user.verification_used_at) {
    const accessToken = jwtHelper.generateToken(user.user_id);
    const refreshToken = jwtHelper.generateRefreshToken(user.user_id);
    return { user, accessToken, refreshToken };
  }

  // Expiration check
  if (
    user.verification_expires_at &&
    new Date(user.verification_expires_at) < new Date()
  ) {
    throw new AppError("Verification token has expired.", 400);
  }

  const emailToSet = user.pending_email || user.email;

  const updatedUser = await authModel.verifyEmailAndClearToken(
    user.user_id,
    emailToSet,
  );

  const accessToken = jwtHelper.generateToken(user.user_id);
  const refreshToken = jwtHelper.generateRefreshToken(user.user_id);

  return { user: updatedUser, accessToken, refreshToken };
};

export const deleteAccount = async (userId) => {
  const user = await authModel.findUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (user.is_active === false)
    throw new AppError("Account is already deactivated.", 400);

  await authModel.deactivateUserTeamMemberships(userId);

  const deactivated = await authModel.deactivateUser(userId);
  if (!deactivated) throw new AppError("Failed to deactivate account.", 500);

  return { message: "Account deactivated successfully." };
};

export const changePassword = async (
  userId,
  { currentPassword, newPassword },
) => {
  const user = await authModel.findUserById(userId);
  // SECURITY PATCH: Ensure user is active
  if (!user || user.is_active === false)
    throw new AppError("User not found", 404);

  const match = await comparePassword(currentPassword, user.password);
  if (!match) throw new AppError("Current password is incorrect.", 400);

  const passwordErrors = validPassword(newPassword);
  if (passwordErrors.length)
    throw new AppError(
      `Password is invalid: ${passwordErrors.map((e) => e.message).join(", ")}`,
      400,
    );

  if (currentPassword === newPassword)
    throw new AppError(
      "New password must be different from the current password.",
      400,
    );

  const hashed = await hashPassword(newPassword);
  const updated = await authModel.updateUserPassword(userId, hashed);
  if (!updated) throw new AppError("Failed to update password.", 500);

  return { message: "Password updated successfully." };
};

export const requestPasswordReset = async (email) => {
  if (!validEmail(email)) throw new AppError("Email is invalid", 400);

  const user = await authModel.findUser(email);

  if (!user || user.is_active === false)
    return {
      message:
        "If that email is registered, you will receive a reset link shortly.",
    };

  const resetToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await authModel.setPasswordResetToken(user.user_id, resetToken, expiresAt);
  await sendPasswordResetEmail(email, resetToken);

  return {
    message:
      "If that email is registered, you will receive a reset link shortly.",
  };
};

export const resetPassword = async (token, newPassword) => {
  if (!token) throw new AppError("Reset token is required.", 400);

  const passwordErrors = validPassword(newPassword);
  if (passwordErrors.length)
    throw new AppError(
      `Password is invalid: ${passwordErrors.map((e) => e.message).join(", ")}`,
      400,
    );

  const user = await authModel.getUserByVerificationToken(token);
  if (!user || user.is_active === false)
    throw new AppError("Invalid or expired reset token.", 400);

  if (user.verification_used_at)
    throw new AppError("This reset link has already been used.", 400);

  if (new Date(user.verification_expires_at) < new Date())
    throw new AppError(
      "Reset token has expired. Please request a new one.",
      400,
    );

  const hashed = await hashPassword(newPassword);
  const updated = await authModel.resetPasswordAndClearToken(
    user.user_id,
    hashed,
  );
  if (!updated) throw new AppError("Failed to reset password.", 500);

  return { message: "Password reset successfully. You can now log in." };
};
