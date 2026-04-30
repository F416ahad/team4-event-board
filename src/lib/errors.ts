export class InvalidSaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSaveError";
  }
}