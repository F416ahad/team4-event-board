// custom errors for comment feature

export class CommentEmptyError extends Error {
  constructor() { super("Comment cannot be empty"); }
}