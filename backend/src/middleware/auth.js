import jwt from "jsonwebtoken";

export default function verifyToken(req, res, next) {
  // Confirm correct auth headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer "))
    return res.status(401).json({
      message: "Missing or invalid Authorization header",
      token: "invalid",
    });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).send({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, process.env.SECRETKEY);
    req.userId = decoded.userId;
    next();
  } catch (_e) {
    return res.status(500).send({
      message: "Invalid or expire token",
      token: "invalid",
    });
  }
}
