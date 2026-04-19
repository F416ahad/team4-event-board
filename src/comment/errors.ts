// custom errors for comment feature

export class CommentEmptyError extends Error {
  constructor() { super("Comment cannot be empty"); }
}
// custom error with hardcoded message "Comment cannot be empty"

export class CommentTooLongError extends Error {
  constructor() { super("Comment too long (max 500 characters)"); }
}

export class UnauthorizedDeleteError extends Error {
  constructor() { super("You do not have permission to delete this comment"); }
}