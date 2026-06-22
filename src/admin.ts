import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  CollectionReference,
  DocumentReference,
  Firestore,
  Query,
} from "firebase-admin/firestore";

import { Database } from "@/core/database";
import type { CollectionHandle, DocumentHandle } from "@/core/handles";
import type { QueryBuilder } from "@/core/query";
import type { Doc } from "@/core/types";
import { AdminDriver } from "@/drivers/admin";

export function createDatabase(firestore: Firestore): Database {
  return new Database(new AdminDriver(firestore));
}

// Typed escape hatches, cast the neutral unknown .ref to the admin SDK ref
export function docRef<S extends StandardSchemaV1>(
  handle: DocumentHandle<S>,
): DocumentReference<Doc<S>> {
  return handle.ref as DocumentReference<Doc<S>>;
}

export function collectionRef<S extends StandardSchemaV1>(
  handle: CollectionHandle<S>,
): CollectionReference<Doc<S>> {
  return handle.ref as CollectionReference<Doc<S>>;
}

export function queryRef<S extends StandardSchemaV1>(
  builder: QueryBuilder<S>,
): Query<Doc<S>> {
  return builder.ref as Query<Doc<S>>;
}

export * from "@/index";
