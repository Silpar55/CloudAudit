export class AppError extends Error {
  constructor(message, statusCode, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = options.code;
    this.headline = options.headline;
    this.detail = options.detail;
    this.meta = options.meta;
  }
}
