import jwt from "jsonwebtoken";

export const verifyJwtHelper = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const generateToken = (id) => {
  // Short-lived Access Token (15 minutes)
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const generateRefreshToken = (id) => {
  // Long-lived Refresh Token (7 days)
  return jwt.sign({ userId: id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
