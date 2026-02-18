import jwt from "jsonwebtoken";

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

  const user = {
    firstName,
    lastName,
    email: email.toLowerCase(),
    password: hashPass,
    phone,
    countryCode,
  };

  const result = await authModel.createUser(user);

  if (!result) throw new AppError("Unable to create a user", 422);

  const token = jwt.sign({ userId: result.user_id }, process.env.SECRETKEY, {
    expiresIn: "1h",
  });

  return {
    result,
    token,
  };
};

export const loginUser = async ({ email, password }) => {
  // Input validation
  if (!validEmail(email)) throw new AppError("Email is invalid", 400);

  const passwordResults = validPassword(password);
  if (passwordResults.length > 0)
    throw new AppError(
      `Password is invalid check the following ${passwordResults[0].message}`,
      400,
    );

  // Database validation
  const user = await authModel.findUser(email);
  if (!user || !(await comparePassword(password, user.password || "")))
    throw new AppError("Invalid credentials, try again", 404);

  const token = jwt.sign({ userId: user.user_id }, process.env.SECRETKEY, {
    expiresIn: "1h",
  });

  return token;
};

export const getUser = async (token) => {
  if (!token) return res.status(401).send({ message: "Access denied" });

  try {
    const decoded = verifyJwtHelper(token);
    const user = await authModel.findUserById(decoded?.userId);

    return user;
  } catch (_e) {
    throw new AppError("Invalid or expire token", 404);
  }
};
