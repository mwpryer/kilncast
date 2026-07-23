// Base for firesmith's own failures, SDK and network errors propagate untouched
export class FiresmithError extends Error {
  override readonly name: string = "FiresmithError";
}
