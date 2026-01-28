import {
  validName,
  validEmail,
  validPassword,
  validPhone,
  AppError,
  hashPassword,
  comparePassword,
} from "#utils";

import { findUser, createUser } from "#models";
import jwt from "jsonwebtoken";

export async function registerUser({
  firstName,
  lastName,
  email,
  password,
  phone,
  countryCode,
}) {
  if (!validName(firstName)) throw new AppError("First name is invalid", 400);

  if (!validName(lastName)) throw new AppError("Last name is invalid", 400);

  if (!validEmail(email)) throw new AppError("Email is invalid", 400);

  // Check if email exist in the database
  const userInDB = await findUser(email);

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

  const result = await createUser(user);

  return result;
}

export async function loginUser({ email, password }) {
  // Input validation
  if (!validEmail(email)) throw new AppError("Email is invalid", 400);

  const passwordResults = validPassword(password);
  if (passwordResults.length > 0)
    throw new AppError(
      `Password is invalid check the following ${passwordResults[0].message}`,
      400,
    );

  // Database validation
  const user = await findUser(email);
  if (!user || !(await comparePassword(password, user.password || "")))
    throw new AppError("Invalid credentials, try again", 404);

  const token = jwt.sign({ userId: user.user_id }, process.env.SECRETKEY, {
    expiresIn: "1h",
  });

  return token;
}
