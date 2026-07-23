import { initializeApp as initAdminApp } from "firebase-admin/app";
import {
  GeoPoint as AdminGeoPoint,
  getFirestore as getAdminFirestore,
  Timestamp as AdminTimestamp,
} from "firebase-admin/firestore";
import { deleteApp, initializeApp as initWebApp } from "firebase/app";
import {
  Bytes as WebBytes,
  connectFirestoreEmulator,
  doc as webDoc,
  GeoPoint as WebGeoPoint,
  getDoc as webGetDoc,
  initializeFirestore,
  terminate,
  Timestamp as WebTimestamp,
} from "firebase/firestore";

import { createDatabase as createAdminDatabase } from "@/admin";
import type { Database } from "@/core/database";
import { createDatabase as createWebDatabase } from "@/web";
import type { DriverKit } from "./support";

// emulators:exec sets this for the child process, fall back for a manual run
const HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const [HOST_NAME, HOST_PORT] = HOST.split(":");

// Wipe a project's documents through the emulator's REST control plane
async function clearProject(projectId: string): Promise<void> {
  const res = await fetch(
    `http://${HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    throw new Error(
      `Failed to clear emulator project ${projectId}: ${res.status}`,
    );
  }
}

// Admin finds the emulator via FIRESTORE_EMULATOR_HOST, no query cache so a REST wipe is enough
const adminApp = initAdminApp({ projectId: "firesmith-admin" }, "admin");
const adminFs = getAdminFirestore(adminApp);

export const adminKit: DriverKit = {
  name: "admin",
  db: createAdminDatabase(adminFs),
  rawGet: async (path) => (await adminFs.doc(path).get()).data(),
  clear: () => clearProject("firesmith-admin"),
  timestamp: (seconds, nanoseconds) => new AdminTimestamp(seconds, nanoseconds),
  isSdkTimestamp: (value) => value instanceof AdminTimestamp,
  geoPoint: (latitude, longitude) => new AdminGeoPoint(latitude, longitude),
  isSdkGeoPoint: (value) => value instanceof AdminGeoPoint,
  bytes: (data) => Buffer.from(data),
  isSdkBytes: (value) => Buffer.isBuffer(value),
};

// Web SDK caches a listener's first delivery, so rebuild the client each clear() for a cold cache
let webSeq = 0;
let webApp = initWebApp({ projectId: "firesmith-web" }, "web-0");
// Long polling is the reliable off-browser transport
let webFs = initializeFirestore(webApp, { experimentalForceLongPolling: true });
connectFirestoreEmulator(webFs, HOST_NAME!, Number(HOST_PORT));
let webDb = createWebDatabase(webFs);

async function rebuildWeb(): Promise<void> {
  await terminate(webFs).catch(() => {});
  await deleteApp(webApp).catch(() => {});
  webSeq += 1;
  webApp = initWebApp({ projectId: "firesmith-web" }, `web-${webSeq}`);
  webFs = initializeFirestore(webApp, { experimentalForceLongPolling: true });
  connectFirestoreEmulator(webFs, HOST_NAME!, Number(HOST_PORT));
  webDb = createWebDatabase(webFs);
}

export const webKit: DriverKit = {
  name: "web",
  get db(): Database {
    return webDb;
  },
  rawGet: async (path) => (await webGetDoc(webDoc(webFs, path))).data(),
  clear: async () => {
    await clearProject("firesmith-web");
    await rebuildWeb();
  },
  timestamp: (seconds, nanoseconds) => new WebTimestamp(seconds, nanoseconds),
  isSdkTimestamp: (value) => value instanceof WebTimestamp,
  geoPoint: (latitude, longitude) => new WebGeoPoint(latitude, longitude),
  isSdkGeoPoint: (value) => value instanceof WebGeoPoint,
  bytes: (data) => WebBytes.fromUint8Array(data),
  isSdkBytes: (value) => value instanceof WebBytes,
};

export const allKits: readonly DriverKit[] = [adminKit, webKit];
