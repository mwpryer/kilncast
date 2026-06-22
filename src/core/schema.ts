import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { CollectionDef, InferOutput } from "@/core/types";

export interface CollectionOptions {
  raw?: readonly string[];
}

export function collection<S extends StandardSchemaV1>(
  name: string,
  // Id comes from the path, reject a schema declaring its own
  schema: S & ("id" extends keyof InferOutput<S> ? never : unknown),
  options?: CollectionOptions,
): CollectionDef<S> {
  if (options?.raw && options.raw.length > 0) {
    return { name, schema, raw: options.raw };
  }
  return { name, schema };
}
