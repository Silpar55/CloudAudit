import bcrypt from "bcryptjs";

export const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (inputPassword, storedHash) => {
  return await bcrypt.compare(inputPassword, storedHash);
};
