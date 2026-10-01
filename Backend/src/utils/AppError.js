export class AppError extends Error {
  constructor(status, message, fields, retryAfter) {
    super(message);
    this.status = status;
    this.fields = fields;
    this.retryAfter = retryAfter;
  }
}
