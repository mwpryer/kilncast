// Base for kilncast's own failures, SDK and network errors propagate untouched
export class KilncastError extends Error {
  override readonly name: string = "KilncastError";
}
