/**
 * CloudAudit — Jest setup for backend unit tests.
 * Runs before each test file; extend here for global mocks or matchers.
 */

process.env.SECRETKEY = "testing-key";
process.env.SKIP_PLATFORM_ASSUME_ROLE = "true";
