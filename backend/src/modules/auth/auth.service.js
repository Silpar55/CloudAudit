import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail } from "#utils/aws/ses.js";

import {
  validName,
  validEmail,
  validPassword,
  validPhone,
} from "#utils/validation.js";

import { hashPassword, comparePassword } from "#utils/password.js";

import { AppError } from "#utils/helper/AppError.js";
import { verifyJwtHelper } from "#utils/helper/jwt-helper.js";

import * as authModel from "#modules/auth/auth.model.js";

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

  // Block login if the email is not verified
  if (!user.email_verified) {
    throw new AppError(
      "Please verify your email address before logging in.",
      403,
    );
  }

  const token = jwt.sign({ userId: user.user_id }, process.env.SECRETKEY, {
    expiresIn: "1h",
  });

  return token;
};

export const getUser = async (token) => {
  if (!token) throw new AppError("Access denied", 401);

  try {
    const decoded = verifyJwtHelper(token);
    const user = await authModel.findUserById(decoded?.userId);

    return user;
  } catch (_e) {
    throw new AppError("Invalid or expire token", 404);
  }
};

export const verifyEmailToken = async (token) => {
  const user = await authModel.getUserByVerificationToken(token);
  if (!user) throw new AppError("Invalid or expired verification token", 400);

  if (new Date(user.verification_expires_at) < new Date()) {
    throw new AppError("Verification token has expired.", 400);
  }

  const emailToSet = user.pending_email || user.email;
  const updatedUser = await authModel.verifyEmailAndClearToken(
    user.user_id,
    emailToSet,
  );

  const accessToken = jwt.sign(
    { userId: updatedUser.user_id },
    process.env.SECRETKEY,
    { expiresIn: "1h" },
  );

  return { user: updatedUser, accessToken };
};
