import jwt from "jsonwebtoken";

export const verifyJwtHelper = (token) => {
  return jwt.verify(token, process.env.SECRETKEY);
};
