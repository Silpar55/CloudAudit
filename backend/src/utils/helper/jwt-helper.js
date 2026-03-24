import jwt from "jsonwebtoken";

export const verifyJwtHelper = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export const generateToken = (id) => {
  // Short-lived access token (refresh via /auth/refresh + httpOnly cookie)
  return jwt.sign({ userId: id }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (id) => {
  // Long-lived Refresh Token (7 days)
  return jwt.sign({ userId: id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
};
