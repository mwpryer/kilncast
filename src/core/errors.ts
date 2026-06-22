// Base for firecast's own failures, SDK and network errors propagate untouched
export class FirecastError extends Error {
  override readonly name: string = "FirecastError";
}
