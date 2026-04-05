/**
 * CloudAudit — Express middleware: `index`.
 * Applied to requests before route handlers; keep side effects minimal and ordered.
 */

export { verifyToken } from "./auth.middleware.js";
export { errorHandler } from "./error.middleware.js";
export {
  verifyPermissions,
  verifyTeamId,
  verifyTeamMembership,
} from "./team.middleware.js";
export { verifyAwsAccId } from "./aws.middleware.js";
